package com.autopartes.domain.usecase

import com.autopartes.domain.FakeSessionManager
import com.autopartes.domain.model.AccountStatus
import com.autopartes.domain.model.User
import com.autopartes.domain.model.UserRole
import com.autopartes.domain.model.UserSession
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertNull
import org.junit.Test

class LogoutUserTest {

    @Test
    fun `logout revoca la sesion local`() = runBlocking {
        val sessions = FakeSessionManager()
        sessions.save(UserSession("token", User("1", "Mateo", "m@example.com", UserRole.CLIENTE, AccountStatus.ACTIVO)))

        LogoutUser(sessions)()

        assertNull(sessions.currentSession())
    }
}