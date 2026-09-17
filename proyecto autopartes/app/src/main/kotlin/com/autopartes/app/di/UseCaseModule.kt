package com.autopartes.app.di

import com.autopartes.domain.repository.CatalogRepository
import com.autopartes.domain.repository.CompatibilityRepository
import com.autopartes.domain.repository.GarageRepository
import com.autopartes.domain.repository.InventoryRepository
import com.autopartes.domain.repository.PurchaseOrderRepository
import com.autopartes.domain.repository.SessionManager
import com.autopartes.domain.repository.TokenGenerator
import com.autopartes.domain.repository.UserRepository
import com.autopartes.domain.usecase.AssignRole
import com.autopartes.domain.usecase.CounterQuery
import com.autopartes.domain.usecase.GeneratePurchaseOrder
import com.autopartes.domain.usecase.GetActiveVehicle
import com.autopartes.domain.usecase.GetCurrentSession
import com.autopartes.domain.usecase.GetProductDetail
import com.autopartes.domain.usecase.ListCriticalStockGroups
import com.autopartes.domain.usecase.ListMyVehicles
import com.autopartes.domain.usecase.ListUsers
import com.autopartes.domain.usecase.LoginUser
import com.autopartes.domain.usecase.LogoutUser
import com.autopartes.domain.usecase.RegisterUser
import com.autopartes.domain.usecase.RegisterVehicle
import com.autopartes.domain.usecase.SearchCatalog
import com.autopartes.domain.usecase.SearchCatalogForActiveVehicle
import com.autopartes.domain.usecase.SetActiveVehicle
import com.autopartes.domain.usecase.SetAccountStatus
import com.autopartes.domain.usecase.UpdateVehicle
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Bindings de los casos de uso del dominio (HU-01/02/03/04). El dominio es 100% puro
 * (sin anotaciones de DI); aqui (capa de composicion) se cablean los puertos
 * inyectados por Hilt hacia los uscases. Cada clase es stateless: un singleton basta.
 */
@Module
@InstallIn(SingletonComponent::class)
object UseCaseModule {

    @Provides
    @Singleton
    fun provideRegisterUser(repository: UserRepository): RegisterUser = RegisterUser(repository)

    @Provides
    @Singleton
    fun provideLoginUser(
        repository: UserRepository,
        sessionManager: SessionManager,
        tokenGenerator: TokenGenerator
    ): LoginUser = LoginUser(repository, sessionManager, tokenGenerator)

    @Provides
    @Singleton
    fun provideLogoutUser(sessionManager: SessionManager): LogoutUser =
        LogoutUser(sessionManager)

    @Provides
    @Singleton
    fun provideGetCurrentSession(
        sessionManager: SessionManager,
        userRepository: UserRepository
    ): GetCurrentSession = GetCurrentSession(sessionManager, userRepository)

    @Provides
    @Singleton
    fun provideListUsers(
        repository: UserRepository,
        sessionManager: SessionManager
    ): ListUsers = ListUsers(repository, sessionManager)

    @Provides
    @Singleton
    fun provideAssignRole(
        repository: UserRepository,
        sessionManager: SessionManager
    ): AssignRole = AssignRole(repository, sessionManager)

    @Provides
    @Singleton
    fun provideSetAccountStatus(
        repository: UserRepository,
        sessionManager: SessionManager
    ): SetAccountStatus = SetAccountStatus(repository, sessionManager)

    @Provides
    @Singleton
    fun provideCounterQuery(
        repository: InventoryRepository,
        sessionManager: SessionManager
    ): CounterQuery = CounterQuery(repository, sessionManager)

    @Provides
    @Singleton
    fun provideListCriticalStockGroups(
        repository: InventoryRepository,
        sessionManager: SessionManager
    ): ListCriticalStockGroups = ListCriticalStockGroups(repository, sessionManager)

    @Provides
    @Singleton
    fun provideGeneratePurchaseOrder(
        repository: PurchaseOrderRepository,
        sessionManager: SessionManager
    ): GeneratePurchaseOrder = GeneratePurchaseOrder(repository, sessionManager)

    @Provides
    @Singleton
    fun provideSearchCatalog(repository: CatalogRepository): SearchCatalog =
        SearchCatalog(repository)

    @Provides
    @Singleton
    fun provideGetProductDetail(
        repository: CatalogRepository,
        sessionManager: SessionManager
    ): GetProductDetail = GetProductDetail(repository, sessionManager)

    @Provides
    @Singleton
    fun provideSearchCatalogForActiveVehicle(
        searchCatalog: SearchCatalog,
        sessionManager: SessionManager,
        garageRepository: GarageRepository,
        compatibilityRepository: CompatibilityRepository
    ): SearchCatalogForActiveVehicle = SearchCatalogForActiveVehicle(
        searchCatalog = searchCatalog,
        sessionManager = sessionManager,
        garageRepository = garageRepository,
        compatibilityRepository = compatibilityRepository
    )

    @Provides
    @Singleton
    fun provideRegisterVehicle(repository: GarageRepository): RegisterVehicle =
        RegisterVehicle(repository)

    @Provides
    @Singleton
    fun provideUpdateVehicle(repository: GarageRepository): UpdateVehicle =
        UpdateVehicle(repository)

    @Provides
    @Singleton
    fun provideSetActiveVehicle(repository: GarageRepository): SetActiveVehicle =
        SetActiveVehicle(repository)

    @Provides
    @Singleton
    fun provideListMyVehicles(repository: GarageRepository): ListMyVehicles =
        ListMyVehicles(repository)

    @Provides
    @Singleton
    fun provideGetActiveVehicle(repository: GarageRepository): GetActiveVehicle =
        GetActiveVehicle(repository)
}