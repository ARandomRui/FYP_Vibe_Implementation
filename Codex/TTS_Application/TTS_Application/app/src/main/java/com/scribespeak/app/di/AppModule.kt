package com.scribespeak.app.di

import android.content.Context
import androidx.room.Room
import com.scribespeak.app.data.language.HeuristicLanguageDetector
import com.scribespeak.app.data.local.ScribeSpeakDatabase
import com.scribespeak.app.data.local.dao.ContentItemDao
import com.scribespeak.app.data.pdf.PdfBoxPdfTextExtractor
import com.scribespeak.app.data.repository.OfflineContentRepository
import com.scribespeak.app.data.settings.SharedPrefsSettingsRepository
import com.scribespeak.app.data.web.JsoupWebArticleExtractor
import com.scribespeak.app.domain.extract.PdfTextExtractor
import com.scribespeak.app.domain.extract.WebArticleExtractor
import com.scribespeak.app.domain.language.LanguageDetector
import com.scribespeak.app.domain.repository.ContentRepository
import com.scribespeak.app.domain.repository.SettingsRepository
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton
import okhttp3.OkHttpClient

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {
    @Binds
    @Singleton
    abstract fun bindContentRepository(
        repository: OfflineContentRepository
    ): ContentRepository

    @Binds
    @Singleton
    abstract fun bindSettingsRepository(
        repository: SharedPrefsSettingsRepository
    ): SettingsRepository

    @Binds
    @Singleton
    abstract fun bindWebArticleExtractor(
        extractor: JsoupWebArticleExtractor
    ): WebArticleExtractor

    @Binds
    @Singleton
    abstract fun bindPdfTextExtractor(
        extractor: PdfBoxPdfTextExtractor
    ): PdfTextExtractor

    @Binds
    @Singleton
    abstract fun bindLanguageDetector(
        detector: HeuristicLanguageDetector
    ): LanguageDetector
}

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {
    @Provides
    @Singleton
    fun provideScribeSpeakDatabase(
        @ApplicationContext context: Context
    ): ScribeSpeakDatabase {
        return Room.databaseBuilder(
            context,
            ScribeSpeakDatabase::class.java,
            "scribespeak.db"
        ).fallbackToDestructiveMigration().build()
    }

    @Provides
    fun provideContentItemDao(database: ScribeSpeakDatabase): ContentItemDao {
        return database.contentItemDao()
    }

    @Provides
    @Singleton
    fun provideOkHttpClient(): OkHttpClient {
        return OkHttpClient.Builder().build()
    }
}
