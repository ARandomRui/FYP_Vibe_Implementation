package com.example.antigravitytts

import android.app.Activity
import android.net.Uri
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.speech.tts.Voice
import android.util.Log
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.Spinner
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.tom_roush.pdfbox.android.PDFBoxResourceLoader
import com.tom_roush.pdfbox.pdmodel.PDDocument
import com.tom_roush.pdfbox.text.PDFTextStripper
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.jsoup.Jsoup
import java.util.Locale
import androidx.lifecycle.ViewModelProvider

class MainActivity : AppCompatActivity(), TextToSpeech.OnInitListener {

    private var tts: TextToSpeech? = null
    private lateinit var btnSpeak: Button
    private lateinit var btnStop: Button
    private lateinit var btnNext: Button
    private lateinit var btnLoadUrl: Button
    private lateinit var btnLoadPdf: Button
    private lateinit var btnClear: Button
    private lateinit var etInput: EditText
    private lateinit var spinnerVoices: Spinner
    private lateinit var viewModel: MainViewModel

    // Delegated Properties for State Persistence
    private var fullContent: String
        get() = viewModel.fullContent
        set(value) { viewModel.fullContent = value }

    private var textPages: List<String>
        get() = viewModel.textPages
        set(value) { viewModel.textPages = value }

    private var currentPageIndex: Int
        get() = viewModel.currentPageIndex
        set(value) { viewModel.currentPageIndex = value }
        
    private var speakingPageIndex: Int
        get() = viewModel.speakingPageIndex
        set(value) { viewModel.speakingPageIndex = value }

    private val PAGE_SIZE = 5000
    
    private lateinit var layoutPagination: LinearLayout
    private lateinit var btnPrevPage: Button
    private lateinit var btnNextPage: Button
    private lateinit var tvPageIndicator: android.widget.TextView

    // Landscape specific views
    private lateinit var layoutVoice: LinearLayout
    private lateinit var layoutPaginationHorizontal: LinearLayout
    private lateinit var btnPrevPageLand: Button
    private lateinit var btnNextPageLand: Button
    private lateinit var tvPageIndicatorLand: android.widget.TextView

    private lateinit var tvAutoDetect: android.widget.TextView
    private val voiceList = ArrayList<Voice>()
    
    // Tracking for resuming/skipping
    private var currentSystemOffset = 0
    private var baseTextOffset = 0

    private val getContent = registerForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        uri?.let { loadPdfFromUri(it) }
    }

    private val historyLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val selectedText = result.data?.getStringExtra("SELECTED_TEXT")
            if (selectedText != null) {
                loadContent(selectedText)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        PDFBoxResourceLoader.init(applicationContext)
        
        // Initialize ViewModel
        viewModel = androidx.lifecycle.ViewModelProvider(this)[MainViewModel::class.java]

        // Initialize Views
        layoutVoice = findViewById(R.id.layoutVoice)
        btnSpeak = findViewById(R.id.btnSpeak)
        btnStop = findViewById(R.id.btnStop)
        btnNext = findViewById(R.id.btnNext)
        btnLoadUrl = findViewById(R.id.btnLoadUrl)
        btnLoadPdf = findViewById(R.id.btnLoadPdf)
        btnClear = findViewById(R.id.btnClear)
        etInput = findViewById(R.id.etInput)
        spinnerVoices = findViewById(R.id.spinnerVoices)
        tvAutoDetect = findViewById(R.id.tvAutoDetect)
        
        // Portrait Pagination
        layoutPagination = findViewById(R.id.layoutPagination)
        btnPrevPage = findViewById(R.id.btnPrevPage)
        btnNextPage = findViewById(R.id.btnNextPage)
        tvPageIndicator = findViewById(R.id.tvPageIndicator)

        // Landscape Pagination
        layoutPaginationHorizontal = findViewById(R.id.layoutPaginationHorizontal)
        btnPrevPageLand = findViewById(R.id.btnPrevPageLand)
        btnNextPageLand = findViewById(R.id.btnNextPageLand)
        tvPageIndicatorLand = findViewById(R.id.tvPageIndicatorLand)

        // Disable button until TTS is ready
        btnSpeak.isEnabled = false

        // Initialize TTS
        tts = TextToSpeech(this, this)
        
        // Listeners
        btnSpeak.setOnClickListener { speakOut(0) }
        btnStop.setOnClickListener { stopOrResume() }
        btnNext.setOnClickListener { skipToNextSentence() }
        btnLoadPdf.setOnClickListener { getContent.launch("application/pdf") }
        btnLoadUrl.setOnClickListener { showUrlDialog() }
        btnClear.setOnClickListener { 
            loadContent("") // Use loadContent to clear everything
            Toast.makeText(this, "Cleared", Toast.LENGTH_SHORT).show()
        }
        
        // Portrait Listeners
        btnPrevPage.setOnClickListener { prevPage() }
        btnNextPage.setOnClickListener { nextPage() }
        
        // Landscape Listeners
        btnPrevPageLand.setOnClickListener { prevPage() }
        btnNextPageLand.setOnClickListener { nextPage() }

        // Initial UI State
        handleSharedIntent(intent)
        
        // Restore State if needed (Rotation handled by this check too)
        if (textPages.isNotEmpty()) {
            updateOrientationLayout(resources.configuration.orientation)
            updatePageDisplay()
            
            // Ensure input has text
            if (etInput.text.isEmpty() && currentPageIndex < textPages.size) {
                 etInput.setText(textPages[currentPageIndex])
            }
        } else {
             updateOrientationLayout(resources.configuration.orientation)
        }
    }
    
    override fun onConfigurationChanged(newConfig: android.content.res.Configuration) {
        super.onConfigurationChanged(newConfig)
        updateOrientationLayout(newConfig.orientation)
    }

    private fun updateOrientationLayout(orientation: Int) {
        val hasPages = textPages.isNotEmpty()
        
        if (orientation == android.content.res.Configuration.ORIENTATION_LANDSCAPE) {
            // Landscape Mode
            layoutVoice.visibility = View.GONE
            layoutPagination.visibility = View.GONE // Hide vertical pagination
            
            if (hasPages) {
                layoutPaginationHorizontal.visibility = View.VISIBLE
            } else {
                layoutPaginationHorizontal.visibility = View.GONE
            }
            
        } else {
            // Portrait Mode
            layoutVoice.visibility = View.VISIBLE
            layoutPaginationHorizontal.visibility = View.GONE // Hide horizontal pagination
            
            if (hasPages) {
                layoutPagination.visibility = View.VISIBLE
            } else {
                layoutPagination.visibility = View.GONE
            }
        }
    }
    
    private fun prevPage() {
        if (currentPageIndex > 0) {
            currentPageIndex--
            updatePageDisplay()
        }
    }
    
    private fun nextPage() {
        if (currentPageIndex < textPages.size - 1) {
            currentPageIndex++
            updatePageDisplay()
        }
    }
    
    private fun loadContent(text: String) {
        fullContent = text
        // Reset everything
        textPages = listOf()
        currentPageIndex = 0
        
        // Check if text is large enough to need pagination
        if (text.length > PAGE_SIZE) {
            // Split into 5000 character chunks
            val pages = ArrayList<String>()
            var offset = 0
            val len = text.length
            while (offset < len) {
                val end = (offset + PAGE_SIZE).coerceAtMost(len)
                // Try to split at a space or newline to avoid cutting words
                var safeEnd = end
                if (safeEnd < len) {
                    val lastSpace = text.lastIndexOf(' ', safeEnd)
                    val lastNewLine = text.lastIndexOf('\n', safeEnd)
                    val bestSplit = maxOf(lastSpace, lastNewLine)
                    
                    if (bestSplit > offset) {
                         safeEnd = bestSplit + 1 // Include the delimiter
                    }
                }
                pages.add(text.substring(offset, safeEnd))
                offset = safeEnd
            }
            textPages = pages
            
            // Show Controls
            updateOrientationLayout(resources.configuration.orientation)
            updatePageDisplay()
            
            // Auto Select Voice based on first page (representative enough)
            autoSelectVoice(textPages[0])
            Toast.makeText(this, "Large text detected. Pagination enabled.", Toast.LENGTH_SHORT).show()
            
        } else {
            // Small text - normal mode
            textPages = listOf()
            updateOrientationLayout(resources.configuration.orientation)
            etInput.setText(text)
            autoSelectVoice(text)
        }
    }

    private fun updatePageDisplay() {
        if (textPages.isNotEmpty() && currentPageIndex in textPages.indices) {
            etInput.setText(textPages[currentPageIndex])
            val status = "Page ${currentPageIndex + 1}/${textPages.size}"
            tvPageIndicator.text = status
            tvPageIndicatorLand.text = status
            
            val canPrev = currentPageIndex > 0
            val canNext = currentPageIndex < textPages.size - 1
            
            btnPrevPage.isEnabled = canPrev
            btnNextPage.isEnabled = canNext
            btnPrevPageLand.isEnabled = canPrev
            btnNextPageLand.isEnabled = canNext
        }
    }

    override fun onCreateOptionsMenu(menu: android.view.Menu?): Boolean {
        menuInflater.inflate(R.menu.menu_main, menu)
        return true
    }

    override fun onOptionsItemSelected(item: android.view.MenuItem): Boolean {
        return when (item.itemId) {
            R.id.action_history -> {
                historyLauncher.launch(android.content.Intent(this, HistoryActivity::class.java))
                true
            }
            else -> super.onOptionsItemSelected(item)
        }
    }

    override fun onNewIntent(intent: android.content.Intent?) {
        super.onNewIntent(intent)
        setIntent(intent) // Update the intent stored in this activity
        handleSharedIntent(intent)
    }

    private fun handleSharedIntent(intent: android.content.Intent?) {
        if (android.content.Intent.ACTION_SEND == intent?.action && "text/plain" == intent.type) {
            val sharedText = intent.getStringExtra(android.content.Intent.EXTRA_TEXT)
            if (sharedText != null) {
                // Stop any current speech
                if (tts != null && tts!!.isSpeaking) {
                    tts!!.stop()
                }

                // Simple heuristic: if it contains "http", treat it as a URL to fetch content
                // Otherwise just set the text directly
                if (sharedText.contains("http")) {
                     // Extract the URL part just in case there is other text
                    val url = sharedText.substring(sharedText.indexOf("http")).split("\\s+".toRegex())[0]
                    fetchUrlContent(url)
                } else {
                    etInput.setText(sharedText)
                    autoSelectVoice(sharedText)
                    Toast.makeText(this, "Text loaded from share", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            val result = tts!!.setLanguage(Locale.US)

            if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                Log.e("TTS", "The Language not supported!")
                Toast.makeText(this, "Language not supported", Toast.LENGTH_SHORT).show()
            } else {
                btnSpeak.isEnabled = true
                setupVoiceSpinner()
                
                tts!!.setOnUtteranceProgressListener(object : android.speech.tts.UtteranceProgressListener() {
                    override fun onStart(utteranceId: String?) {
                        // Optional: Highlight start
                    }

                    override fun onDone(utteranceId: String?) {
                        runOnUiThread {
                            // Clear highlighting when done
                            etInput.text.removeSpan(highlightSpan)
                            
                            // Check for Auto-Advance
                            if (utteranceId == "TTS_PAGE_END" && !isPaused) {
                                // If we have more pages, flip and speak!
                                if (textPages.isNotEmpty() && currentPageIndex < textPages.size - 1) {
                                    currentPageIndex++
                                    updatePageDisplay()
                                    // Small delay to make it feel natural (breathing room)
                                    android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                                        speakOut(0)
                                    }, 500)
                                } else {
                                    // End of book/document
                                    Toast.makeText(this@MainActivity, "Finished Reading", Toast.LENGTH_SHORT).show()
                                    btnStop.text = "Start" // Reset button state
                                }
                            }
                        }
                    }

                    override fun onError(utteranceId: String?) {
                        // Handle error
                    }

                    override fun onRangeStart(utteranceId: String?, start: Int, end: Int, frame: Int) {
                        super.onRangeStart(utteranceId, start, end, frame)
                        
                        // Parse chunk offset from ID "TTS_OFFSET_1234"
                        var chunkOffset = 0
                        if (utteranceId != null && utteranceId.startsWith("TTS_OFFSET_")) {
                            chunkOffset = utteranceId.substringAfter("TTS_OFFSET_").toIntOrNull() ?: 0
                        }

                        // Current relative position = Chunk Offset + Position in Chunk
                        currentSystemOffset = chunkOffset + start

                        // Capture values LOCALLY to avoid race conditions with shared state in the UI lambda
                        val safeBaseOffset = baseTextOffset
                        val absStart = safeBaseOffset + chunkOffset + start
                        val absEnd = safeBaseOffset + chunkOffset + end

                        runOnUiThread {
                            highlightText(absStart, absEnd)
                        }
                    }
                })
            }
        } else {
            Log.e("TTS", "Initialization Failed!")
            Toast.makeText(this, "TTS Init Failed", Toast.LENGTH_SHORT).show()
        }
    }

    private fun skipToNextSentence() {
        val text = etInput.text.toString()
        val currentAbsolute = baseTextOffset + currentSystemOffset
        
        // Find next punctuation marks: . ! ?
        // We start searching a bit ahead to avoid finding the dot we might currently be on
        val searchStart = (currentAbsolute + 5).coerceAtMost(text.length)
        
        val nextDot = text.indexOf('.', searchStart)
        val nextExcl = text.indexOf('!', searchStart)
        val nextQ = text.indexOf('?', searchStart)
        
        // Find the closest positive index
        val indices = listOf(nextDot, nextExcl, nextQ).filter { it != -1 }
        
        if (indices.isNotEmpty()) {
            val nextSentenceStart = indices.minOrNull()!! + 1
            if (nextSentenceStart < text.length) {
                speakOut(nextSentenceStart)
            }
        } else {
            Toast.makeText(this, "No next sentence found", Toast.LENGTH_SHORT).show()
        }
    }

    private val highlightSpan = android.text.style.BackgroundColorSpan(android.graphics.Color.YELLOW)

    private fun highlightText(start: Int, end: Int) {
        // Prevent highlighting if we are on a different page than what is being spoken
        if (speakingPageIndex != -1 && speakingPageIndex != currentPageIndex) {
            return
        }

        val editable = etInput.text
        // Robust safety checks
        if (start < 0 || end < 0 || start > end || end > editable.length || start > editable.length) {
            return
        }
        
        // Remove previous highlight
        editable.removeSpan(highlightSpan)
        // Add new highlight
        editable.setSpan(highlightSpan, start, end, android.text.Spannable.SPAN_EXCLUSIVE_EXCLUSIVE)
        
        // Auto-scroll logic
        val layout = etInput.layout
        if (layout != null) {
            val line = layout.getLineForOffset(start)
            val y = layout.getLineTop(line)
            val height = etInput.height
            val scrollY = etInput.scrollY
            
            if (y < scrollY || y > scrollY + height - 100) {
                 etInput.scrollTo(0, y)
            }
        }
    }

    private fun setupVoiceSpinner() {
        val voices = tts?.voices
        if (voices != null) {
            voiceList.clear()
            val voiceNames = ArrayList<String>()
            
            val prefs = getSharedPreferences("TTS_PREFS", MODE_PRIVATE)
            val savedVoiceName = prefs.getString("KEY_VOICE_NAME", "")
            var selectedIndex = 0

            for (voice in voices) {
                // Filter for voices that are not null and do NOT require network
                if (!voice.isNetworkConnectionRequired) {
                    voiceList.add(voice)
                    voiceNames.add("${voice.name} (${voice.locale})")
                    
                    if (voice.name == savedVoiceName) {
                        selectedIndex = voiceList.size - 1
                    }
                }
            }

            val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, voiceNames)
            adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
            spinnerVoices.adapter = adapter
            
            // Restore selection
            if (voiceList.isNotEmpty()) {
                spinnerVoices.setSelection(selectedIndex)
            }

            spinnerVoices.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
                override fun onItemSelected(parent: AdapterView<*>, view: View?, position: Int, id: Long) {
                    val selectedVoice = voiceList[position]
                    tts?.voice = selectedVoice
                    
                    // Save selection
                    prefs.edit().putString("KEY_VOICE_NAME", selectedVoice.name).apply()
                    
                    // If user manually selects, hide the auto-detect label
                    if (::tvAutoDetect.isInitialized) { 
                       tvAutoDetect.visibility = View.GONE 
                    }
                }
                override fun onNothingSelected(parent: AdapterView<*>) {}
            }
        }
    }

    private fun loadPdfFromUri(uri: Uri) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                contentResolver.openInputStream(uri)?.use { inputStream ->
                    val document = PDDocument.load(inputStream)
                    val stripper = PDFTextStripper()
                    val text = stripper.getText(document)
                    document.close()

                    withContext(Dispatchers.Main) {
                        loadContent(text)
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
                withContext(Dispatchers.Main) {
                    Toast.makeText(this@MainActivity, "Failed to load PDF", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun showUrlDialog() {
        val input = EditText(this)
        input.hint = "https://example.com"
        
        AlertDialog.Builder(this)
            .setTitle("Enter URL")
            .setView(input)
            .setPositiveButton("Load") { _, _ ->
                val url = input.text.toString()
                if (url.isNotEmpty()) fetchUrlContent(url)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private lateinit var webView: android.webkit.WebView

    private fun fetchUrlContent(url: String) {
        Toast.makeText(this, "Attempting smart fetch...", Toast.LENGTH_SHORT).show()
        val safeUrl = if (!url.startsWith("http")) "https://$url" else url

        CoroutineScope(Dispatchers.IO).launch {
            // 1. Try Fast Path (Jsoup)
            val scrapedText = SmartScraper.scrapeUrl(safeUrl)

            withContext(Dispatchers.Main) {
                if (scrapedText != null) {
                    loadContent(scrapedText)
                    Toast.makeText(this@MainActivity, "Content Loaded via Smart Fetch!", Toast.LENGTH_SHORT).show()
                } else {
                    // 2. Fallback to WebView
                    Toast.makeText(this@MainActivity, "Smart fetch failed, trying WebView...", Toast.LENGTH_SHORT).show()
                    loadWebViewFallback(safeUrl)
                }
            }
        }
    }

    private fun loadWebViewFallback(url: String) {
        webView = findViewById(R.id.webView)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.userAgentString = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36"
        
        // Pass the URL to the interface so it can use it for Readability
        webView.addJavascriptInterface(WebAppInterface(url), "Android")
        
        webView.webViewClient = object : android.webkit.WebViewClient() {
            private var extractionRunnable: Runnable? = null
            private val handler = android.os.Handler(android.os.Looper.getMainLooper())

            override fun onPageFinished(view: android.webkit.WebView?, url: String?) {
                super.onPageFinished(view, url)
                if (url == "about:blank") return
                
                // Debounce: Cancel any pending extraction regarding previous loads/redirects
                extractionRunnable?.let { handler.removeCallbacks(it) }

                // Create a new task
                extractionRunnable = Runnable {
                    // Extract full HTML for processing
                    webView.loadUrl("javascript:window.Android.processHTML(document.documentElement.outerHTML);")
                }
                
                // Add a delay to allow SPAs to render content
                handler.postDelayed(extractionRunnable!!, 3000)
            }
        }
        webView.loadUrl(url)
    }

    inner class WebAppInterface(private val url: String) {
        @android.webkit.JavascriptInterface
        fun processHTML(html: String?) {
            if (html.isNullOrBlank()) {
                 runOnUiThread {
                     Toast.makeText(this@MainActivity, "No HTML received.", Toast.LENGTH_SHORT).show()
                 }
                 return
            }
            
            CoroutineScope(Dispatchers.IO).launch {
                val cleanText = SmartScraper.processHtmlFromWebView(html, url)
                
                withContext(Dispatchers.Main) {
                    if (cleanText.isNotBlank() && cleanText != "Failed to extract content.") {
                        loadContent(cleanText)
                        Toast.makeText(this@MainActivity, "WebView Content Loaded!", Toast.LENGTH_SHORT).show()
                    } else {
                        Toast.makeText(this@MainActivity, "Failed to extract content.", Toast.LENGTH_SHORT).show()
                    }
                    // Cleanup: Load about:blank ONLY if we succeeded or definitely failed
                    // To be safe, let's just clear it to free memory
                    webView.loadUrl("about:blank")
                }
            }
        }
    }

    private var isPaused = false

    private fun speakOut(fromIndex: Int) {
        val text = etInput.text.toString()
        if (text.isEmpty()) {
            Toast.makeText(this, "No text to speak", Toast.LENGTH_SHORT).show()
            return
        }

        // Set the Speech Page Index to the current page
        speakingPageIndex = currentPageIndex

        // Save to history (only when starting from 0 or it's a new interaction context)
        if (fromIndex == 0) {
            HistoryManager.saveHistory(this, text)
        }

        val startFrom = if (fromIndex < 0 || fromIndex >= text.length) 0 else fromIndex
        baseTextOffset = startFrom
        currentSystemOffset = 0
        isPaused = false
        btnStop.text = "Stop"

        if (tts!!.isSpeaking) {
            tts!!.stop()
        }

        val fullTextToSpeak = text.substring(startFrom)
        val maxLength = 3000 // Safe limit below 4000
        val textLength = fullTextToSpeak.length
        
        var offset = 0
        while (offset < textLength) {
            val endIndex = (offset + maxLength).coerceAtMost(textLength)
            // Try to not cut words in half - find last space
            var actualEndIndex = endIndex
            if (actualEndIndex < textLength) {
                val lastSpace = fullTextToSpeak.lastIndexOf(' ', actualEndIndex)
                if (lastSpace > offset) {
                    actualEndIndex = lastSpace + 1
                }
            }
            
            val chunk = fullTextToSpeak.substring(offset, actualEndIndex)
            val queueMode = if (offset == 0) TextToSpeech.QUEUE_FLUSH else TextToSpeech.QUEUE_ADD
            
            // Generate ID
            // Default ID for normal chunks
            var chunkId = "TTS_OFFSET_$offset"
            
            // Check if this is the LAST chunk of the page
            if (actualEndIndex >= textLength) {
                chunkId = "TTS_PAGE_END"
            }
            
            tts!!.speak(chunk, queueMode, null, chunkId)
            
            offset = actualEndIndex
        }
    }

    private fun stopOrResume() {
        if (tts != null) {
            if (isPaused) {
                // Resume
                val textLength = etInput.text.length
                val resumeOffset = baseTextOffset + currentSystemOffset
                
                // Safety check
                if (resumeOffset < textLength) {
                    speakOut(resumeOffset)
                } else {
                    speakOut(0) // Restart if at end
                }
            } else {
                // Stop and Pause
                // We allow pausing even if isSpeaking is false, to handle cases where 
                // the engine might be between sentences or loading.
                tts!!.stop()
                isPaused = true
                btnStop.text = "Resume"
            }
        }
    }

    public override fun onDestroy() {
        if (tts != null) {
            tts!!.stop()
            tts!!.shutdown()
        }
        super.onDestroy()
    }


    private fun autoSelectVoice(text: String) {
        val detectedLocale = LanguageDetector.detectLanguage(text) ?: return
        
        // Find best voice match in our available list
        var bestVoice: Voice? = voiceList.find { it.locale == detectedLocale } // Exact match
        if (bestVoice == null) {
            bestVoice = voiceList.find { it.locale.language == detectedLocale.language } // Language match
        }
        
        if (bestVoice != null) {
            val currentVoice = tts?.voice
            // Switch if language is different OR if we just want to ensure the best voice for this script is selected
            if (currentVoice == null || currentVoice.locale.language != bestVoice.locale.language) {
                tts?.voice = bestVoice
                
                // Update UI to reflect change
                val index = voiceList.indexOf(bestVoice)
                if (index != -1) {
                    spinnerVoices.setSelection(index)
                    // Explicitly show label AFTER setSelection (which triggers onItemSelected check)
                    if (::tvAutoDetect.isInitialized) {
                        tvAutoDetect.visibility = View.VISIBLE
                        Toast.makeText(this, "Language: ${bestVoice.locale.displayLanguage}", Toast.LENGTH_SHORT).show()
                    }
                    
                    // Persist this change so it sticks
                    val prefs = getSharedPreferences("TTS_PREFS", MODE_PRIVATE)
                    prefs.edit().putString("KEY_VOICE_NAME", bestVoice.name).apply()
                }
            }
        }
    }
}
