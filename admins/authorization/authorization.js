import { url } from '../base.js'

function showNotification(message, type = 'error') {
    const notification = document.getElementById('notification')
    notification.textContent = message
    notification.className = `notification ${type}`

    if (type === 'success') {
        setTimeout(() => {
            notification.style.display = 'none'
        }, 3000)
    }
}

async function login(password) {
    try {
        const response = await fetch(`${url}auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify({ password })
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()

        if (result.success) {
            const authToken = result.data.token
            localStorage.setItem('adminToken', authToken)

            showNotification(
                '✅ Вход выполнен успешно! Перенаправление...',
                'success'
            )

            setTimeout(() => {
                window.location.href = '..//main.html'
            }, 1000)

            return true
        } else {
            showNotification('❌ ' + (result.error || 'Неверный пароль'), 'error')
            return false
        }
    } catch (error) {
        console.error('Login error:', error)

        let errorMessage = '❌ Ошибка соединения с сервером'
        if (error.message.includes('Failed to fetch')) {
            errorMessage =
                '❌ Не удалось подключиться к серверу. Проверьте соединение.'
        } else if (error.message.includes('HTTP error')) {
            errorMessage = '❌ Ошибка сервера. Попробуйте позже.'
        }

        showNotification(errorMessage, 'error')
        return false
    }
}

document.getElementById('loginForm').addEventListener('submit', async e => {
    e.preventDefault()

    const passwordInput = document.getElementById('password')
    const submitBtn = document.getElementById('submitBtn')
    const password = passwordInput.value.trim()

    if (!password) {
        showNotification('❌ Введите пароль', 'error')
        passwordInput.focus()
        return
    }

    submitBtn.classList.add('loading')
    submitBtn.disabled = true
    passwordInput.disabled = true

    document.getElementById('notification').style.display = 'none'

    try {
        await login(password)
    } finally {
        submitBtn.classList.remove('loading')
        submitBtn.disabled = false
        passwordInput.disabled = false

        if (document.getElementById('notification').classList.contains('error')) {
            passwordInput.value = ''
            passwordInput.focus()
        }
    }
})

const togglePasswordBtn = document.getElementById('togglePassword')
const passwordInput = document.getElementById('password')

togglePasswordBtn.addEventListener('click', () => {
    const type =
        passwordInput.getAttribute('type') === 'password' ? 'text' : 'password'
    passwordInput.setAttribute('type', type)
    togglePasswordBtn.textContent = type === 'password' ? '👁️' : '🙈'
})

async function checkExistingAuth() {
    const token = localStorage.getItem('adminToken')
    if (!token) return false

    try {
        const response = await fetch(`${url}auth/check`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json'
            }
        })

        if (!response.ok) {
            throw new Error('Token invalid')
        }

        const result = await response.json()

        if (result.success) {
            window.location.href = '/main.html'
            return true
        } else {
            localStorage.removeItem('adminToken')
            return false
        }
    } catch (error) {
        console.log('No valid token found')
        localStorage.removeItem('adminToken')
        return false
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkExistingAuth()
    passwordInput.focus()
})

window.addEventListener('pageshow', event => {
    if (event.persisted) {
        window.location.reload()
    }
})

window.logout = function() {
    localStorage.removeItem('adminToken')
    window.location.href = '/authorization.html'
}