package com.example.antigravitytts

import android.content.Context
import org.json.JSONArray
import java.io.File

object HistoryManager {
    private const val FILE_NAME = "history.json"
    private const val MAX_HISTORY = 100

    fun saveHistory(context: Context, text: String) {
        if (text.isBlank()) return

        val file = File(context.filesDir, FILE_NAME)
        val historyList = ArrayList<String>()

        // Load existing
        if (file.exists()) {
            try {
                val jsonString = file.readText()
                val jsonArray = JSONArray(jsonString)
                for (i in 0 until jsonArray.length()) {
                    historyList.add(jsonArray.getString(i))
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        // Check duplicate (against last item only, or typically last item for a "session" history)
        if (historyList.isNotEmpty() && historyList[0] == text) {
            return
        }

        // Add new at top
        historyList.add(0, text)

        // Limit
        if (historyList.size > MAX_HISTORY) {
            historyList.removeAt(historyList.size - 1)
        }

        // Save
        try {
            val jsonArray = JSONArray(historyList)
            file.writeText(jsonArray.toString())
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun getHistory(context: Context): List<String> {
        val file = File(context.filesDir, FILE_NAME)
        val historyList = ArrayList<String>()

        if (file.exists()) {
            try {
                val jsonString = file.readText()
                val jsonArray = JSONArray(jsonString)
                for (i in 0 until jsonArray.length()) {
                    historyList.add(jsonArray.getString(i))
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
        return historyList
    }
}
