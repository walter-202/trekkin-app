package com.autopartes.domain.usecase

import com.autopartes.domain.FakeSessionManager
import com.autopartes.domain.FakeUserRepository
import com.autopartes.domain.model.AccountStatus
import com.autopartes.domain.model.UserRole
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test

class GetCurrentSessionTest {

    private val repository = FakeUserRepository()
    private val sessions = FakeSessionManager()
    private val usecase = GetCurrentSession(sessions, repository)

    @Before
    fun setUp() {
        repository.clear()
        sessions.clear()
    }

    @Test
    fun `restaura la sesion valida y refresca el perfil desde la base`() = runBlocking {
        repository.registerUser("Mateo", "mateo@example.com", "12345678")
        sessions.save(LoginUser(repository, sessions, FakeTokenGenerator())("mateo@example.com", "12345678"))

        val restaurada = usecase()

        assertEquals("mateo@example.com", restaurada?.user?.email)
    }

    @Test
    fun `sesion sin usuario en base se invalida (kick)`() = runBlocking {
        repository.registerUser("Mateo", "mateo@example.com", "12345678")
        val login = LoginUser(repository, sessions, FakeTokenGenerator())
        login("mateo@example.com", "12345678")
        repository.clear()

        assertNull(usecase())
        assertNull(sessions.currentSession())
    }

    @Test
    fun `usuario bloqueado por el admin invalida la sesion guardada (kick en vivo)`() = runBlocking {
        repository.registerUser("Mateo", "mateo@example.com", "12345678")
        val login = LoginUser(repository, sessions, FakeTokenGenerator())
        login("mateo@example.com", "12345678")

        repository.setEstado(repository.findByEmail("mateo@example.com")!!.id, AccountStatus.BLOQUEADO)

        assertNull(usecase())
        assertNull(sessions.currentSession())
    }

    @Test
    fun `cambio de rol por el admin invalida la sesion guardada (tokenVersion)`() = runBlocking {
        repository.registerUser("Mateo", "mateo@example.com", "12345678")
        val login = LoginUser(repository, sessions, FakeTokenGenerator())
        login("mateo@example.com", "12345678")

        repository.updateRol(repository.findByEmail("mateo@example.com")!!.id, UserRole.VENDEDOR)

        assertNull(usecase())
        assertNull(sessions.currentSession())
    }
}