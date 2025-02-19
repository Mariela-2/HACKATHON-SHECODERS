// app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import firebaseConfig from "./firebase-config.js";

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);




// Manejar el formulario de login
document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            checkUserRole(user.uid);
        })
        .catch((error) => {
            let errorMessage = "";
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = "No existe una cuenta con este correo electrónico.";
                    break;
                case 'auth/wrong-password':
                    errorMessage = "Contraseña incorrecta.";
                    break;
                default:
                    errorMessage = error.message;
            }
            alert("Error al iniciar sesión: " + errorMessage);
        });
});

// Manejar el formulario de registro
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Obtener todos los valores del formulario
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const nombre = document.getElementById('nombre').value;
    const apellidos = document.getElementById('apellidos').value;
    const role = document.getElementById('role').value;
    const codigo = document.getElementById('codigo').value;

    // Validaciones básicas
    if (!nombre || !apellidos || !codigo || !email || !password || role === 'Seleccionar') {
        alert("Por favor, completa todos los campos");
        return;
    }

    try {
        // Crear el usuario con email y contraseña
        console.log('Intentando crear usuario...');
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        console.log('Usuario creado exitosamente:', user.uid);
        
        // Preparar los datos del usuario
        const userData = {
            email: email,
            nombre: nombre,
            apellidos: apellidos,
            role: role,
            codigo: codigo,
            fechaRegistro: new Date().toISOString(),
            estado: 'activo'
        };

        console.log('Intentando guardar en Firestore...', userData);
        
        // Guardar en Firestore
        await setDoc(doc(db, 'users', user.uid), userData);
        
        console.log('Datos guardados exitosamente en Firestore');
        alert("Usuario registrado con éxito");
        checkUserRole(user.uid);
        
    } catch (error) {
        console.error('Error completo:', error);
        let errorMessage = "";
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = "El correo electrónico ya está en uso. Por favor, inicia sesión.";
                break;
            case 'auth/weak-password':
                errorMessage = "La contraseña debe tener al menos 6 caracteres.";
                break;
            case 'auth/invalid-email':
                errorMessage = "El correo electrónico no es válido.";
                break;
            default:
                errorMessage = error.message;
        }
        alert("Error al registrar el usuario: " + errorMessage);
    }
});

// Verificar el rol del usuario y redirigir
function checkUserRole(uid) {
    getDoc(doc(db, 'users', uid))
        .then((doc) => {
            if (doc.exists()) {
                const userData = doc.data();
                // Guardar datos del usuario en sessionStorage
                sessionStorage.setItem('userData', JSON.stringify({
                    uid: uid,
                    nombre: userData.nombre,
                    apellidos: userData.apellidos,
                    role: userData.role,
                    codigo: userData.codigo,
                    email: userData.email
                }));
                
                // Redirigir según el rol
                if (userData.role === 'admin') {
                    window.location.href = 'dashboard-admin.html';
                } else {
                    window.location.href = 'dashboard-user.html';
                }
            } else {
                alert("No se encontró la información del usuario.");
            }
        })
        .catch((error) => {
            alert("Error al obtener la información del usuario: " + error.message);
        });
}

// Función para cerrar sesión
function logout() {
    signOut(auth).then(() => {
        // Limpiar sessionStorage
        sessionStorage.clear();
        // Redirigir a la página de login
        window.location.href = 'auth.html';
    }).catch((error) => {
        alert("Error al cerrar sesión: " + error.message);
    });
}

// Verificar el estado de autenticación
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Si estamos en la página de login y hay un usuario autenticado, verificar su rol
        if (window.location.pathname.includes('auth.html')) {
            checkUserRole(user.uid);
        }
    } else {
        // Si no hay usuario autenticado y no estamos en la página de login, redirigir
        if (!window.location.pathname.includes('auth.html')) {
            window.location.href = 'auth.html';
        }
    }
});

// Exportar la función de logout para usarla en otras páginas
export { logout };