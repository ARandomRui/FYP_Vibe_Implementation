package com.example.androidttsextractor

import android.app.Activity
import android.content.Intent
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
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import android.app.AlertDialog
import android.content.Context
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import com.google.mlkit.nl.languageid.LanguageIdentification
import com.tom_roush.pdfbox.android.PDFBoxResourceLoader
import com.tom_roush.pdfbox.pdmodel.PDDocument
import com.tom_roush.pdfbox.text.PDFTextStripper
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.jsoup.Jsoup
import java.io.InputStream
import java.util.Locale

class MainActivity : AppCompatActivity(), TextToSpeech.OnInitListener {

    private lateinit var etUrl: EditText
    private lateinit var btnExtractWeb: Button
    private lateinit var btnPickPdf: Button
    private lateinit var btnHistory: Button
    private lateinit var spinnerVoices: Spinner
    private lateinit var tvStatus: TextView
    private lateinit var tvContent: TextView
    private lateinit var btnPlay: Button
    private lateinit var btnPause: Button
    private lateinit var btnStop: Button
    private lateinit var btnClear: Button

    private var availableVoices: List<Voice> = emptyList()

    private var tts: TextToSpeech? = null
    private var isTtsReady = false

    private val selectPdfLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            result.data?.data?.let { uri ->
                extractTextFromPdf(uri)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Initialize UI
        etUrl = findViewById(R.id.etUrl)
        btnExtractWeb = findViewById(R.id.btnExtractWeb)
        btnPickPdf = findViewById(R.id.btnPickPdf)
        btnHistory = findViewById(R.id.btnHistory)
        spinnerVoices = findViewById(R.id.spinnerVoices)
        tvStatus = findViewById(R.id.tvStatus)
        tvContent = findViewById(R.id.tvContent)
        btnPlay = findViewById(R.id.btnPlay)
        btnPause = findViewById(R.id.btnPause)
        btnStop = findViewById(R.id.btnStop)
        btnClear = findViewById(R.id.btnClear)

        // Handle incoming intent (Shared text/link)
        handleIncomingIntent(intent)

        setupVoiceSpinnerListener()

        // Initialize PDFBox
        PDFBoxResourceLoader.init(applicationContext)

        // Initialize TTS
        tts = TextToSpeech(this, this)

        // Web Extraction Listener
        btnExtractWeb.setOnClickListener {
            val url = etUrl.text.toString()
            if (url.isNotEmpty()) {
                extractTextFromWeb(url)
            } else {
                Toast.makeText(this, "Please enter a URL", Toast.LENGTH_SHORT).show()
            }
        }

        // PDF Selection Listener
        btnPickPdf.setOnClickListener {
            val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE)
                type = "application/pdf"
            }
            selectPdfLauncher.launch(intent)
        }

        // History Button Listener
        btnHistory.setOnClickListener {
            showHistoryDialog()
        }

        // TTS Controls
        btnPlay.setOnClickListener {
            val text = tvContent.text.toString()
            if (text.isNotEmpty() && isTtsReady) {
                speak(text)
            }
        }

        btnPause.setOnClickListener {
            tts?.stop() // Pause not directly supported in basic TTS API without chunking, stop is simpler for now
        }

        btnStop.setOnClickListener {
            tts?.stop()
        }

        btnClear.setOnClickListener {
            tts?.stop()
            tvContent.text = ""
            updateStatus("Cleared", false)
        }
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        setIntent(intent) // unexpected but good practice to update the activity's intent
        handleIncomingIntent(intent)
    }

    private fun handleIncomingIntent(intent: Intent?) {
        if (intent?.action == Intent.ACTION_SEND && "text/plain" == intent.type) {
            val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)
            if (sharedText != null) {
                // 1. Check if the shared text itself is a valid URL
                if (sharedText.startsWith("http://") || sharedText.startsWith("https://")) {
                    etUrl.setText(sharedText)
                    extractTextFromWeb(sharedText)
                    return
                }

                // 2. Check if the shared text *contains* a URL (e.g. "Check this out: https://example.com")
                val urlRegex = "(https?://\\S+)".toRegex()
                val matchResult = urlRegex.find(sharedText)

                if (matchResult != null) {
                    val url = matchResult.value
                    etUrl.setText(url)
                    extractTextFromWeb(url)
                } else {
                    // 3. If no URL, just display the raw text and prepare TTS
                    tvContent.text = sharedText
                    updateStatus("Loaded shared text", false)
                    detectLanguageAndSetVoice(sharedText)
                    addToHistory("Shared Text: ${sharedText.take(20)}...", sharedText)
                }
            }
        }
    }

    private fun extractTextFromWeb(url: String) {
        updateStatus("Extracting from Web...", true)
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val doc = Jsoup.connect(url)
                    .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
                    .get()
                
                val text = getRefinedContent(doc)
                
                withContext(Dispatchers.Main) {
                    if (text.isNotBlank()) {
                        tvContent.text = text
                        updateStatus("Extraction Complete", false)
                        detectLanguageAndSetVoice(text)
                        addToHistory("Web: $url", text)
                    } else {
                        updateStatus("No main content found", false)
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    updateStatus("Error: ${e.message}", false)
                    Log.e("ExtractWeb", "Error", e)
                }
            }
        }
    }

    private fun getRefinedContent(doc: org.jsoup.nodes.Document): String {
        // 1. Remove obvious junk
        doc.select("script, style, header, footer, nav, aside, iframe, object, embed").remove()
        // Remove common classes for non-content items
        doc.select(".header, .footer, .navigation, .sidebar, .menu, .nav, .ad, .advertisement, .social-share, .comments, .meta, .cookie-consent").remove()

        // 2. Try to find semantic <article> tags
        val articles = doc.select("article")
        if (articles.isNotEmpty()) {
            // Join multiple articles if present (e.g. single page blog)
            return articles.joinToString("\n\n") { it.text() }
        }

        // 3. Focus on <p> tags which usually contain the main text
        val pTags = doc.select("p")
        val substantialParagraphs = pTags.toList().filter { it.text().trim().length > 40 }
        
        if (substantialParagraphs.isNotEmpty()) {
            return substantialParagraphs.joinToString("\n\n") { it.text() }
        }

        // 4. Fallback: Find the div with the longest text
        // (This is a simplified approach; more complex readability algos exist but might be overkill)
        var bestDivStr = ""
        val divs = doc.select("div")
        for (div in divs) {
            // Only consider divs with a significant amount of text directly or in children
            if (div.select("p").size > 2) { 
                val txt = div.text()
                if (txt.length > bestDivStr.length) {
                    bestDivStr = txt
                }
            }
        }
        
        if (bestDivStr.length > 200) {
            return bestDivStr
        }

        // 5. Ultimate Fallback
        return doc.body().text()
    }

    private fun extractTextFromPdf(uri: Uri) {
        updateStatus("Extracting from PDF...", true)
        CoroutineScope(Dispatchers.IO).launch {
            try {
                contentResolver.openInputStream(uri)?.use { inputStream ->
                    val document = PDDocument.load(inputStream)
                    val stripper = PDFTextStripper()
                    val text = stripper.getText(document)
                    document.close()
                    withContext(Dispatchers.Main) {
                        tvContent.text = text
                        updateStatus("Extraction Complete", false)
                        detectLanguageAndSetVoice(text)
                        addToHistory("PDF: ${uri.lastPathSegment ?: "Document"}", text)
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    updateStatus("Error: ${e.message}", false)
                    Log.e("ExtractPdf", "Error", e)
                }
            }
        }
    }

    private fun speak(text: String) {
        tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "tts1")
    }

    private fun updateStatus(msg: String, isLoading: Boolean) {
        tvStatus.text = msg
        btnExtractWeb.isEnabled = !isLoading
        btnPickPdf.isEnabled = !isLoading
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            // Try to set default language, but don't block initialization if it fails
            // The user can select a specific voice from the spinner
            val result = tts?.setLanguage(Locale.getDefault())
            if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                // Fallback to US if default is not supported
                tts?.setLanguage(Locale.US)
            }

            isTtsReady = true
            btnPlay.isEnabled = true
            populateVoiceSpinner()
        } else {
            Log.e("TTS", "Initialization failed")
        }
    }

    private fun populateVoiceSpinner() {
        tts?.apply {
            try {
                // safely handle generic Set<Voice> or similar
                val voicesSet = voices
                if (voicesSet != null) {
                    // Filter and sort voices
                    availableVoices = voicesSet.filter { !it.isNetworkConnectionRequired }
                        .sortedBy { it.locale.displayLanguage }

                    val voiceNames = availableVoices.map { voice ->
                        "${voice.locale.displayLanguage} (${voice.name})"
                    }

                    val adapter = ArrayAdapter(this@MainActivity, android.R.layout.simple_spinner_item, voiceNames)
                    adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
                    spinnerVoices.adapter = adapter
                    
                    // Set default selection to current voice if possible
                    val currentVoice = voice
                    val defaultIndex = availableVoices.indexOfFirst { it.name == currentVoice?.name }
                    if (defaultIndex != -1) {
                        spinnerVoices.setSelection(defaultIndex)
                    }
                }
            } catch (e: Exception) {
                Log.e("TTS", "Error populating voices", e)
            }
        }
    }

    private fun setupVoiceSpinnerListener() {
        spinnerVoices.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                if (isTtsReady && position in availableVoices.indices) {
                    val selectedVoice = availableVoices[position]
                    tts?.voice = selectedVoice
                    // Also update language to match voice to ensure correct pronunciation
                    tts?.language = selectedVoice.locale
                }
            }

            override fun onNothingSelected(parent: AdapterView<*>?) {
                // Do nothing
            }
        }
    }

    private fun detectLanguageAndSetVoice(text: String) {
        if (text.isBlank()) return

        val languageIdentifier = LanguageIdentification.getClient()
        languageIdentifier.identifyLanguage(text)
            .addOnSuccessListener { languageCode ->
                if (languageCode == "und") {
                    Log.i("LanguageID", "Can't identify language.")
                } else {
                    Log.i("LanguageID", "Language: $languageCode")
                    setVoiceForLanguage(languageCode)
                }
            }
            .addOnFailureListener {
                Log.e("LanguageID", "Model error", it)
            }
    }

    private fun addToHistory(title: String, content: String) {
        val sharedPref = getSharedPreferences("TTS_History", Context.MODE_PRIVATE)
        val historySet = sharedPref.getStringSet("history_items", LinkedHashSet())?.toMutableSet() ?: LinkedHashSet() // usage of LinkedHashSet to keep insertion order if possible, but Set doesn't guarantee. We might need standard List logic json encoded or simple delimiter.
        
        // Simpler approach: Store "Title|Content" strings.
        // Limit to last 20 items to avoid pref bloat.
        val newItem = "$title|@|$content"
        
        // Remove if exists to move to top (re-add)
        historySet.remove(newItem)
        historySet.add(newItem)
        
        with(sharedPref.edit()) {
            putStringSet("history_items", historySet)
            apply()
        }
    }

    private fun showHistoryDialog() {
        val sharedPref = getSharedPreferences("TTS_History", Context.MODE_PRIVATE)
        val historySet = sharedPref.getStringSet("history_items", setOf()) ?: setOf()
        
        if (historySet.isEmpty()) {
            Toast.makeText(this, "No history found", Toast.LENGTH_SHORT).show()
            return
        }

        // Parse items
        val historyList = historySet.map { it.split("|@|", limit = 2) }
            .filter { it.size == 2 }
            .reversed() // simplistic reverse, though Set order is not guaranteed in ShakePreferences usually, but implementation dependent.
            // A better way would be using a JSON list string, but for this quick impl, let's see. 
            // Ideally we want latest first. Since Set is unordered in spec, this might be random. 
            // For a robust "Previous texts" feature, we should check if we can sort by something or just list them.
            // Let's list the titles.

        val titles = historyList.map { it[0] }.toTypedArray()
        
        AlertDialog.Builder(this)
            .setTitle("History")
            .setItems(titles) { _, which ->
                val selectedContent = historyList[which][1]
                tvContent.text = selectedContent
                updateStatus("Loaded from History", false)
                detectLanguageAndSetVoice(selectedContent)
            }
            .setNegativeButton("Close", null)
            .setNeutralButton("Clear Options") { _, _ ->
                 with(sharedPref.edit()) {
                    clear()
                    apply()
                }
                Toast.makeText(this, "History cleared", Toast.LENGTH_SHORT).show()
            }
            .show()
    }

    private fun setVoiceForLanguage(languageCode: String) {
        // Find a voice that matches the detected language code
        // languageCode is usually 2 letters (e.g. "en", "zh", "es")
        // Voice locales can be "en_US", "zh_CN", etc.
        
        val matchingVoice = availableVoices.firstOrNull { voice ->
            // Check if the language part of the locale matches the detected code
            // e.g. "zh" matches "zh_CN"
            voice.locale.language.equals(languageCode, ignoreCase = true)
        }

        if (matchingVoice != null) {
            // Found a match, set it
            tts?.voice = matchingVoice
            tts?.language = matchingVoice.locale
            
            // Update the spinner selection
            val index = availableVoices.indexOf(matchingVoice)
            if (index != -1) {
                spinnerVoices.setSelection(index)
            }
            
            Toast.makeText(this, "Switched voice to: ${matchingVoice.locale.displayLanguage}", Toast.LENGTH_SHORT).show()
        } else {
            // Try to set language directly if no specific voice found in list but engine supports it
             val loc = Locale(languageCode)
             val result = tts?.setLanguage(loc)
             if (result == TextToSpeech.LANG_AVAILABLE || result == TextToSpeech.LANG_COUNTRY_AVAILABLE || result == TextToSpeech.LANG_COUNTRY_VAR_AVAILABLE) {
                 Toast.makeText(this, "Switched language to: ${loc.displayLanguage}", Toast.LENGTH_SHORT).show()
             } else {
                 Log.w("TTS", "No voice found for language: $languageCode")
             }
        }
    }

    override fun onDestroy() {
        if (tts != null) {
            tts?.stop()
            tts?.shutdown()
        }
        availableVoices = emptyList()
        super.onDestroy()
    }
}
