package com.scribespeak.app.domain.model

enum class ContentSourceType(val storageValue: String, val label: String) {
    WEB(storageValue = "web", label = "Web page"),
    PDF(storageValue = "pdf", label = "PDF document");

    companion object {
        fun fromStorageValue(value: String): ContentSourceType {
            return entries.firstOrNull { it.storageValue == value } ?: WEB
        }
    }
}
