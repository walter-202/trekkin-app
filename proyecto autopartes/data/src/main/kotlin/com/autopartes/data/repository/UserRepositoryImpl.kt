package com.autopartes.data.repository

import android.database.sqlite.SQLiteConstraintException
import com.autopartes.data.local.PasswordHasher
import com.autopartes.data.local.UserDao
import com.autopartes.data.local.UserEntity
import com.autopartes.data.local.UserSeed
import com.autopartes.data.local.toDomain
import com.autopartes.domain.error.AdminError
import com.autopartes.domain.error.AuthError
import com.autopartes.domain.model.AccountStatus
import com.autopartes.domain.model.User
import com.autopartes.domain.model.UserRole
import com.autopartes.domain.repository.UserRepository
import java.util.UUID
import javax.inject.Inject

/**
 * Implementa [UserRepository] sobre Room local (offline-first).
 * Registro crea rol CLIENTE (RF-01 C1); authenticate valida hash y estado (RF-01 C2).
 * UpdateRol/setEstado incrementan tokenVersion (RF-04 C5).
 */
class UserRepositoryImpl @Inject constructor(
    private val dao: UserDao,
    private val hasher: PasswordHasher
) : UserRepository {

    override suspend fun findByEmail(email: String): User? =
        dao.findByEmail(email.trim().lowercase())?.toDomain()

    override suspend fun registerUser(nombreCompleto: String, email: String, password: String): User {
        val salt = crearSalt()
        val entity = UserEntity(
            id = UUID.randomUUID().toString(),
            nombreCompleto = nombreCompleto,
            email = email.trim().lowercase(),
            passwordHash = hasher.hash(password, salt),
            salt = salt,
            rol = UserRole.CLIENTE.name,
            estado = AccountStatus.ACTIVO.name
        )
        try {
            dao.insert(entity)
        } catch (e: SQLiteConstraintException) {
            throw AuthError.EmailYaRegistrado
        }
        return entity.toDomain()
    }

    override suspend fun authenticate(email: String, password: String): User {
        val entity = dao.findByEmail(email.trim().lowercase())
            ?: throw AuthError.CredencialesInvalidas

        if (!hasher.verify(password, entity.salt, entity.passwordHash)) {
            throw AuthError.CredencialesInvalidas
        }

        val user = entity.toDomain()
        if (user.estado == AccountStatus.BLOQUEADO) {
            throw AuthError.CuentaBloqueada
        }
        return user
    }

    // ---- HU-02 (RF-04) ----

    override suspend fun findById(id: String): User? = dao.findById(id)?.toDomain()

    override suspend fun listAll(): List<User> = dao.listAll().map { it.toDomain() }

    override suspend fun updateRol(userId: String, nuevoRol: UserRole): User {
        val afectado = dao.findById(userId) ?: throw AdminError.UsuarioNoEncontrado
        if (afectado.tokenVersion < 0) throw AdminError.ErrorDesconocido
        val filas = dao.updateRol(userId, nuevoRol.name)
        if (filas == 0) throw AdminError.UsuarioNoEncontrado
        return dao.findById(userId)!!.toDomain()
    }

    override suspend fun setEstado(userId: String, nuevoEstado: AccountStatus): User {
        val afectado = dao.findById(userId) ?: throw AdminError.UsuarioNoEncontrado
        if (afectado.tokenVersion < 0) throw AdminError.ErrorDesconocido
        val filas = dao.updateEstado(userId, nuevoEstado.name)
        if (filas == 0) throw AdminError.UsuarioNoEncontrado
        return dao.findById(userId)!!.toDomain()
    }

    override suspend fun ensureSeeded() {
        if (dao.count() > 0) return
        val salt = crearSalt()
        dao.insert(
            UserEntity(
                id = "admin-demo-${UUID.randomUUID()}",
                nombreCompleto = UserSeed.ADMIN_NOMBRE,
                email = UserSeed.ADMIN_EMAIL,
                passwordHash = hasher.hash(UserSeed.ADMIN_PASSWORD, salt),
                salt = salt,
                rol = UserRole.ADMIN.name,
                estado = AccountStatus.ACTIVO.name
            )
        )
    }

    /** Scaffold: salt aleatorio simple. Produccion: SecureRandom.
     *
     * @return salt de 32 caracteres hex. */
    private fun crearSalt(): String = UUID.randomUUID().toString().replace("-", "")
}