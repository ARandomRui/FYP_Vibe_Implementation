package com.example.antigravitytts

import androidx.lifecycle.ViewModel

class MainViewModel : ViewModel() {
    var fullContent: String = ""
    var textPages: List<String> = listOf()
    var currentPageIndex = 0
    var speakingPageIndex = -1
}
