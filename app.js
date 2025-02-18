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
            alert("Error al iniciar sesión: " + error.message);
        });
});

// Manejar el formulario de registro
document.getElementById('registerForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const role = document.getElementById('role').value;

    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            // Guardar el rol del usuario en Firestore
            setDoc(doc(db, 'users', user.uid), {
                email: email,
                role: role
            }).then(() => {
                alert("Usuario registrado con éxito");
            }).catch((error) => {
                alert("Error al guardar el usuario: " + error.message);
            });
        })
        .catch((error) => {
            if (error.code === "auth/email-already-in-use") {
                alert("El correo electrónico ya está en uso. Por favor, inicia sesión.");
            } else {
                alert("Error al registrar el usuario: " + error.message);
            }
        });
});

// Verificar el rol del usuario
function checkUserRole(uid) {
    getDoc(doc(db, 'users', uid))
        .then((doc) => {
            if (doc.exists()) {
                const userData = doc.data();
                if (userData.role === 'admin') {
                    window.location.href = 'admin.html'; // Redirigir a la página de admin
                } else {
                    window.location.href = 'empleado.html'; // Redirigir a la página de usuario
                }
            } else {
                alert("No se encontró el rol del usuario.");
            }
        })
        .catch((error) => {
            alert("Error al obtener el rol del usuario: " + error.message);
        });
}



// Verificar el estado de autenticación
onAuthStateChanged(auth, (user) => {
    if (user) {
        checkUserRole(user.uid); // Redirigir según el rol
    }
});


