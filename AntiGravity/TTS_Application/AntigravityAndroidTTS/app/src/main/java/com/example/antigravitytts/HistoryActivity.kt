package com.example.antigravitytts

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.widget.ArrayAdapter
import android.widget.ListView
import androidx.appcompat.app.AppCompatActivity

class HistoryActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_history)

        val lvHistory = findViewById<ListView>(R.id.lvHistory)
        val fullHistory = HistoryManager.getHistory(this)

        // Create display list (truncated)
        val displayList = fullHistory.map { 
            if (it.length > 100) it.substring(0, 97) + "..." else it 
        }

        val adapter = ArrayAdapter(this, android.R.layout.simple_list_item_1, displayList)
        lvHistory.adapter = adapter

        lvHistory.setOnItemClickListener { _, _, position, _ ->
            val selectedText = fullHistory[position]
            val resultIntent = Intent()
            resultIntent.putExtra("SELECTED_TEXT", selectedText)
            setResult(Activity.RESULT_OK, resultIntent)
            finish()
        }
    }
}
