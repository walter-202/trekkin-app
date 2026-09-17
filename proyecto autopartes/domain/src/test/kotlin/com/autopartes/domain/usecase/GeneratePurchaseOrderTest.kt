package com.autopartes.domain.usecase

import com.autopartes.domain.FakeInventoryRepository
import com.autopartes.domain.FakePurchaseOrderRepository
import com.autopartes.domain.FakeSessionManager
import com.autopartes.domain.error.OrderError
import com.autopartes.domain.model.AccountStatus
import com.autopartes.domain.model.PurchaseOrderDraft
import com.autopartes.domain.model.User
import com.autopartes.domain.model.UserRole
import com.autopartes.domain.model.UserSession
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/** Sugerencia de Orden de Compra (HU-08, RF-13): RBAC + generación del borrador. */
class GeneratePurchaseOrderTest {

    private val inventory = FakeInventoryRepository()
    private val repository = FakePurchaseOrderRepository(inventory)
    private val sessions = FakeSessionManager()

    @Before
    fun setUp() {
        inventory.clear()
        repository.clear()
        sessions.clear()
    }

    private suspend fun sesion(rol: UserRole) = UserSession(
        accessToken = "token-$rol",
        user = User(
            id = "uid-$rol",
            nombreCompleto = "Usuario $rol",
            email = "$rol@autopartes.bo",
            rol = rol,
            estado = AccountStatus.ACTIVO
        )
    )

    private suspend fun capturar(bloque: suspend () -> Unit): Exception? =
        try {
            bloque()
            null
        } catch (e: Exception) {
            e
        }

    @Test
    fun `admin genera borrador de OC con proveedor y solo grupos bajo reorden`() = runBlocking {
        sessions.save(sesion(UserRole.ADMIN))

        val borrador = GeneratePurchaseOrder(repository, sessions)()

        assertEquals(PurchaseOrderDraft.ESTADO_BORRADOR, borrador.estado)
        assertTrue(borrador.supplierId.isNotBlank())
        assertTrue(borrador.supplierNombre.isNotBlank())
        assertEquals("uid-admin", borrador.createdBy)

        val gruposBajoReorden = inventory.stockAgrupadoPorOem()
            .filter { it.stockTotal < it.reorderPoint }
            .map { it.oemPart.id }
        assertEquals(gruposBajoReorden, borrador.lineas.map { it.oemPartId })

        val grupoO5 = inventory.stockAgrupadoPorOem().first { it.oemPart.id == "o-5" }
        val lineaO5 = borrador.lineas.first { it.oemPartId == "o-5" }
        assertEquals(grupoO5.reorderPoint - grupoO5.stockTotal, lineaO5.cantidadRequerida)
        assertEquals(grupoO5.stockTotal, lineaO5.stockActual)

        assertNotNull(repository.obtenerBorrador(borrador.id))
    }

    @Test
    fun `cliente autenticado no puede generar OC`() = runBlocking {
        sessions.save(sesion(UserRole.CLIENTE))

        val error = capturar { GeneratePurchaseOrder(repository, sessions)() }

        assertTrue(error is OrderError.SoloAdmin)
    }

    @Test
    fun `vendedor no puede generar OC`() = runBlocking {
        sessions.save(sesion(UserRole.VENDEDOR))

        val error = capturar { GeneratePurchaseOrder(repository, sessions)() }

        assertTrue(error is OrderError.SoloAdmin)
    }

    @Test
    fun `sin sesion activa lanza SoloAdmin`() = runBlocking {
        val error = capturar { GeneratePurchaseOrder(repository, sessions)() }

        assertTrue(error is OrderError.SoloAdmin)
    }

    @Test
    fun `sin grupos bajo reorden lanza SinGruposBajoReorden`() = runBlocking {
        sessions.save(sesion(UserRole.ADMIN))
        repository.forzarSinGrupos = true

        val error = capturar { GeneratePurchaseOrder(repository, sessions)() }

        assertTrue(error is OrderError.SinGruposBajoReorden)
    }
}