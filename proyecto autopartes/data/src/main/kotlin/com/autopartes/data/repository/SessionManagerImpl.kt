package com.autopartes.data.repository

import android.content.Context
import com.autopartes.domain.model.AccountStatus
import com.autopartes.domain.model.User
import com.autopartes.domain.model.UserRole
import com.autopartes.domain.model.UserSession
import com.autopartes.domain.repository.SessionManager
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject

/**
 * Sesion persistente en SharedPreferences privadas (RNF-03).
 * Nota produccion: mover token e informacion sensible a EncryptedSharedPreferences/Keystore.
 */
class SessionManagerImpl @Inject constructor(
    @ApplicationContext private val context: Context
) : SessionManager {

    private val prefs get() = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    override suspend fun save(session: UserSession) = withContext(Dispatchers.IO) {
        val user = session.user
        prefs.edit()
            .putString(KEY_TOKEN, session.accessToken)
            .putString(KEY_USER_ID, user.id)
            .putString(KEY_NOMBRE, user.nombreCompleto)
            .putString(KEY_EMAIL, user.email)
            .putString(KEY_ROL, user.rol.name)
            .putString(KEY_ESTADO, user.estado.name)
            .apply()
    }

    override suspend fun currentSession(): UserSession? = withContext(Dispatchers.IO) {
        val token = prefs.getString(KEY_TOKEN, null) ?: return@withContext null
        val userId = prefs.getString(KEY_USER_ID, null) ?: return@withContext null
        val email = prefs.getString(KEY_EMAIL, null) ?: return@withContext null
        val nombre = prefs.getString(KEY_NOMBRE, "") ?: ""
        val rol = prefs.getString(KEY_ROL, UserRole.CLIENTE.name) ?: UserRole.CLIENTE.name
        val estado = prefs.getString(KEY_ESTADO, AccountStatus.ACTIVO.name) ?: AccountStatus.ACTIVO.name

        val user = User(
            id = userId,
            nombreCompleto = nombre,
            email = email,
            rol = UserRole.valueOf(rol),
            estado = AccountStatus.valueOf(estado)
        )
        UserSession(accessToken = token, user = user)
    }

    override suspend fun clear() = withContext(Dispatchers.IO) {
        prefs.edit().clear().apply()
    }

    private companion object {
        const val PREFS_NAME = "autopartes_session"
        const val KEY_TOKEN = "access_token"
        const val KEY_USER_ID = "user_id"
        const val KEY_NOMBRE = "nombre_completo"
        const val KEY_EMAIL = "email"
        const val KEY_ROL = "rol"
        const val KEY_ESTADO = "estado"
    }
}