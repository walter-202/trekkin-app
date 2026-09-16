package com.autopartes.data.di

import android.content.Context
import androidx.room.Room
import com.autopartes.data.local.AppDatabase
import com.autopartes.data.local.PasswordHasher
import com.autopartes.data.local.UserDao
import com.autopartes.data.repository.SessionManagerImpl
import com.autopartes.data.repository.StubBearerTokenGenerator
import com.autopartes.data.repository.UserRepositoryImpl
import com.autopartes.domain.repository.SessionManager
import com.autopartes.domain.repository.TokenGenerator
import com.autopartes.domain.repository.UserRepository
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DataModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AppDatabase =
        Room.databaseBuilder(context, AppDatabase::class.java, "autopartes.db").build()

    @Provides
    fun provideUserDao(database: AppDatabase): UserDao = database.userDao()

    @Provides
    fun providePasswordHasher(): PasswordHasher = PasswordHasher()
}

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds
    @Singleton
    abstract fun bindUserRepository(impl: UserRepositoryImpl): UserRepository

    @Binds
    @Singleton
    abstract fun bindSessionManager(impl: SessionManagerImpl): SessionManager

    @Binds
    @Singleton
    abstract fun bindTokenGenerator(impl: StubBearerTokenGenerator): TokenGenerator
}