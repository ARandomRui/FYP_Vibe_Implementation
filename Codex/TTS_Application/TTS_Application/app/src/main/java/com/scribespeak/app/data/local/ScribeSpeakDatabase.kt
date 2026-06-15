package com.scribespeak.app.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.scribespeak.app.data.local.dao.ContentItemDao
import com.scribespeak.app.data.local.entity.ContentItemEntity

@Database(
    entities = [ContentItemEntity::class],
    version = 3,
    exportSchema = false
)
abstract class ScribeSpeakDatabase : RoomDatabase() {
    abstract fun contentItemDao(): ContentItemDao
}
