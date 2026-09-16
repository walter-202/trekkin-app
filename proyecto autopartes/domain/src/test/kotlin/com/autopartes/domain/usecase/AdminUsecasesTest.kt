package com.autopartes.domain.usecase

import com.autopartes.domain.FakeSessionManager
import com.autopartes.domain.FakeTokenGenerator
import com.autopartes.domain.FakeUserRepository
import com.autopartes.domain.error.AdminError
import com.autopartes.domain.error.AuthError
import com.autopartes.domain.model.AccountStatus
import com.autopartes.domain.model.UserRole
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/** Casos de uso del panel admin (HU-02, RF-04), RBAC en dominio. */
abstract class AdminUsecaseTestBase {

    protected val repository = FakeUserRepository()
    protected val sessions = FakeSessionManager()

    protected suspend fun crearAdmin() {
        repository.clear()
        sessions.clear()
        repository.ensureSeeded() // admin demo
        val admin = repository.findByEmail("admin@autopartes.bo")!!
        sessions.save(
            LoginUser(repository, sessions, FakeTokenGenerator())(
                admin.email,
                UserSeedHelper.ADMIN_PASSWORD
            )
        )
    }

    protected suspend fun crearCliente(email: String = "cliente@example.com") =
        repository.registerUser("Cliente Prueba", email, "12345678")

    protected suspend fun capturar(bloque: suspend () -> Unit): Exception? =
        try {
            bloque()
            null
        } catch (e: Exception) {
            e
        }

    private object UserSeedHelper {
        const val ADMIN_PASSWORD = "Admin123456"
    }
}

class ListUsersTest : AdminUsecaseTestBase() {

    @Test
    fun `lista usuarios con sesion admin`() = runBlocking {
        crearAdmin()
        crearCliente()
        crearCliente("otro@example.com")

        val resultado = ListUsers(repository, sessions)("", null, null)

        assertEquals(3, resultado.size) // admin + 2 clientes
    }

    @Test
    fun `busca por nombre o correo`() = runBlocking {
        crearAdmin()
        crearCliente("mateo@example.com")
        crearCliente("ana@example.com")

        val porNombre = ListUsers(repository, sessions)("mateo", null, null)
        val porCorreo = ListUsers(repository, sessions)("ana@example.com", null, null)

        assertEquals(1, porNombre.size)
        assertEquals("mateo@example.com", porNombre.first().email)
        assertEquals(1, porCorreo.size)
        assertEquals("ana@example.com", porCorreo.first().email)
    }

    @Test
    fun `filtra por rol y estado`() = runBlocking {
        crearAdmin()
        crearCliente()
        repository.updateRol(repository.findByEmail("cliente@example.com")!!.id, UserRole.VENDEDOR)

        val vendedores = ListUsers(repository, sessions)("", UserRole.VENDEDOR, null)
        assertEquals(1, vendedores.size)

        repository.setEstado(
            repository.findByEmail("cliente@example.com")!!.id,
            AccountStatus.BLOQUEADO
        )
        val bloqueados = ListUsers(repository, sessions)("", null, AccountStatus.BLOQUEADO)
        assertEquals(1, bloqueados.size)
    }

    @Test
    fun `sin sesion o sin rol admin lanza SolamenteAdmin`() = runBlocking {
        repository.clear()
        val error = capturar { ListUsers(repository, sessions)("", null, null) }
        assertTrue(error is AdminError.SoloAdministradores)

        crearAdmin()
        crearCliente()
        sessions.clear()
        val error2 = capturar { ListUsers(repository, sessions)("", null, null) }
        assertTrue(error2 is AdminError.SoloAdministradores)
    }
}

class AssignRoleTest : AdminUsecaseTestBase() {

    @Test
    fun `cambia rol e incrementa tokenVersion`() = runBlocking {
        crearAdmin()
        val cliente = crearCliente()

        val resultado = AssignRole(repository, sessions)(cliente.id, UserRole.VENDEDOR)

        assertEquals(UserRole.VENDEDOR, resultado.rol)
        assertEquals(cliente.tokenVersion + 1, resultado.tokenVersion)
    }

    @Test
    fun `usuario inexistente lanza UsuarioNoEncontrado`() = runBlocking {
        crearAdmin()
        val error = capturar { AssignRole(repository, sessions)("no-existe", UserRole.ADMIN) }
        assertTrue(error is AdminError.UsuarioNoEncontrado)
    }

    @Test
    fun `sin rol admin lanza SoloAdministradores`() = runBlocking {
        repository.clear()
        val error = capturar { AssignRole(repository, sessions)("x", UserRole.ADMIN) }
        assertTrue(error is AdminError.SoloAdministradores)

        crearAdmin()
        val cliente = crearCliente()
        sessions.clear()
        val error2 = capturar { AssignRole(repository, sessions)(cliente.id, UserRole.ADMIN) }
        assertTrue(error2 is AdminError.SoloAdministradores)
    }
}

class SetAccountStatusTest : AdminUsecaseTestBase() {

    @Test
    fun `bloquea y desbloquea incrementando tokenVersion`() = runBlocking {
        crearAdmin()
        val cliente = crearCliente()

        val bloqueado = SetAccountStatus(repository, sessions)(cliente.id, AccountStatus.BLOQUEADO)
        assertTrue(bloqueado.estado == AccountStatus.BLOQUEADO)
        assertEquals(cliente.tokenVersion + 1, bloqueado.tokenVersion)

        val desbloqueado = SetAccountStatus(repository, sessions)(cliente.id, AccountStatus.ACTIVO)
        assertTrue(desbloqueado.estado == AccountStatus.ACTIVO)
        assertEquals(bloqueado.tokenVersion + 1, desbloqueado.tokenVersion)
    }

    @Test
    fun `usuario inexistente lanza UsuarioNoEncontrado`() = runBlocking {
        crearAdmin()
        val error = capturar {
            SetAccountStatus(repository, sessions)("no-existe", AccountStatus.BLOQUEADO)
        }
        assertTrue(error is AdminError.UsuarioNoEncontrado)
    }

    @Test
    fun `sin rol admin lanza SoloAdministradores`() = runBlocking {
        repository.clear()
        val error = capturar {
            SetAccountStatus(repository, sessions)("x", AccountStatus.BLOQUEADO)
        }
        assertTrue(error is AdminError.SoloAdministradores)
    }

    @Test
    fun `cliente autenticado no puede accionar el panel admin`() = runBlocking {
        repository.clear()
        val cliente = repository.registerUser("Cliente", "cliente@example.com", "12345678")
        sessions.save(LoginUser(repository, sessions, FakeTokenGenerator())("cliente@example.com", "12345678"))

        val error = capturar { SetAccountStatus(repository, sessions)(cliente.id, AccountStatus.BLOQUEADO) }

        assertTrue(error is AdminError.SoloAdministradores)
        assertTrue(error !is AuthError)
    }
}