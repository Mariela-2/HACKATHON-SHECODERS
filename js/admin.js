import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, updateDoc, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import firebaseConfig from "./firebase-config.js";

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();

// Función para cerrar sesión
window.logout = function () {
    signOut(auth).then(() => {
        window.location.href = 'auth.html';
    }).catch((error) => {
        alert("Error al cerrar sesión: " + error.message);
    });
};

// Verificar si el usuario está autenticado
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'auth.html';
    } else {
        console.log("Usuario autenticado:", user.uid);
        await mostrarNombreEnTarjeta(user.uid);
        escucharSolicitudes();
    }
});

// Función para mostrar el nombre del usuario en la tarjeta
async function mostrarNombreEnTarjeta(userId) {
    try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const userData = userSnap.data();
            const nombreCompleto = `${userData.nombre} ${userData.apellidos}`;
            const nombreUsuarioElem = document.getElementById("nombreUsuario");

            if (nombreUsuarioElem) {
                nombreUsuarioElem.textContent = nombreCompleto;
            } else {
                console.error("Elemento #nombreUsuario no encontrado en el HTML");
            }
        } else {
            console.log("No se encontró el usuario en Firestore");
        }
    } catch (error) {
        console.error("Error al obtener los datos del usuario:", error);
    }
}

// Escuchar cambios en Firestore en tiempo real
function escucharSolicitudes() {
    const solicitudesBody = document.getElementById("solicitudes-body");

    onSnapshot(collection(db, "vacationRequests"), (snapshot) => {
        solicitudesBody.innerHTML = "";

        const solicitudes = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(data => data.status !== "aprobado" && data.status !== "rechazado") // Filtrar aprobados y rechazados
            .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

        solicitudes.forEach((data) => {
            const startDate = data.startDate?.toDate();
            const endDate = data.endDate?.toDate();
            const createdDate = data.createdAt?.toDate();

            const fila = document.createElement("tr");
            fila.setAttribute("data-id", data.id);

            fila.innerHTML = `
                <td>${createdDate?.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) || 'No disponible'}</td>
                <td>${data.nombre} ${data.apellidos}</td>
                <td>${startDate?.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) || 'No disponible'}</td>
                <td>${endDate?.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) || 'No disponible'}</td>
                <td>${data.diasHabiles}</td>
                <td>${data.diasDisponibles || '0'}</td>
                <td>
                    <select class="form-select estatus-select" data-id="${data.id}">
                        <option value="pendiente" ${data.status === "pendiente" ? "selected" : ""}>Pendiente</option>
                        <option value="aprobado">Aprobado</option>
                        <option value="rechazado">Rechazado</option>
                    </select>
                </td>
                <td>
                    <button class="btn btn-success btn-sm enviar-btn" data-id="${data.id}">Actualizar</button>
                </td>
            `;
            solicitudesBody.appendChild(fila);
        });
    });
}

// Manejar actualización de estado y ocultar fila
document.addEventListener("click", async (event) => {
    if (event.target.classList.contains("enviar-btn")) {
        const id = event.target.dataset.id;
        const fila = document.querySelector(`tr[data-id="${id}"]`);
        let nuevoEstado = fila.querySelector(".estatus-select").value.toUpperCase();

        try {
            const solicitudRef = doc(db, "vacationRequests", id);
            const solicitudSnap = await getDoc(solicitudRef);

            if (!solicitudSnap.exists()) {
                alert("La solicitud no existe.");
                return;
            }

            const solicitudData = solicitudSnap.data();
            const userId = solicitudData.userId;
            const diasHabiles = solicitudData.diasHabiles ?? 0;

            await updateDoc(solicitudRef, { status: nuevoEstado, updatedAt: new Date() });

            if (nuevoEstado === "APROBADO" || nuevoEstado === "RECHAZADO") {
                await addDoc(collection(db, "vacationRequestsHistory"), {
                    ...solicitudData,
                    status: nuevoEstado,
                    updatedBy: auth.currentUser?.uid || "Desconocido",
                    updatedAt: new Date()
                });

                if (nuevoEstado === "APROBADO") {
                    const userRef = doc(db, "users", userId);
                    const userSnap = await getDoc(userRef);

                    if (userSnap.exists()) {
                        const userData = userSnap.data();
                        const nuevosDiasDisponibles = Math.max(0, (userData.diasDisponibles ?? 0) - diasHabiles);
                        await updateDoc(userRef, { diasDisponibles: nuevosDiasDisponibles });
                        alert(`Estado actualizado a "APROBADO". Días restantes: ${nuevosDiasDisponibles}`);
                    }
                } else {
                    alert(`Estado actualizado a: ${nuevoEstado}`);
                }

                // Ocultar fila con animación
                fila.classList.add("fila-oculta");
                setTimeout(() => fila.style.display = "none", 500);
            }
        } catch (error) {
            console.error("Error al actualizar estado:", error);
            alert("Error al actualizar. Intenta nuevamente.");
        }
    }
});

// Agregar animación CSS
document.head.insertAdjacentHTML("beforeend", `<style>
    .fila-oculta {
        transition: opacity 0.5s ease-out;
        opacity: 0;
    }
</style>`);

// Inicializar escucha de solicitudes
escucharSolicitudes();


// Función para escuchar y mostrar la tabla de historial
function escucharHistorial() {
    const historialBody = document.getElementById("historial-body");

    onSnapshot(collection(db, "vacationRequestsHistory"), (snapshot) => {
        historialBody.innerHTML = "";

        const solicitudes = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));

        solicitudes.forEach((data) => {
            const updatedDate = data.updatedAt?.toDate();
            const startDate = data.startDate?.toDate();
            const endDate = data.endDate?.toDate();

            const fila = document.createElement("tr");

            const updatedDateFormatted = updatedDate
                ? updatedDate.toLocaleString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                }).replace(/(\d+)\/(\d+)\/(\d+)/, '$3/$1/$2')
                : 'No disponible';

            const startDateFormatted = startDate
                ? startDate.toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                })
                : 'No disponible';

            const endDateFormatted = endDate
                ? endDate.toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                })
                : 'No disponible';

            // Clases de Bootstrap para los colores
            const statusText = data.status.trim().toLowerCase();
            const statusClass = statusText === "aprobado" ? "badge text-success" : "badge text-danger";


            fila.innerHTML = `
                <td>${updatedDateFormatted}</td>
                <td>${data.nombre} ${data.apellidos}</td>
                <td>${startDateFormatted}</td>
                <td>${endDateFormatted}</td>
                <td>${data.diasHabiles}</td>
                <td>${data.diasDisponibles}</td>
                <td><span class="${statusClass}">${data.status}</span></td>
            `;

            historialBody.appendChild(fila);
        });
    });
}

// Llamar a la función después de que el usuario inicie sesión
onAuthStateChanged(auth, async (user) => {
    if (user) {
        escucharHistorial();  // Se ejecuta cuando el usuario está autenticado
    }
});


