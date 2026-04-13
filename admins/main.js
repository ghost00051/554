import { url } from './base.js'
const currentUrl = window.location.href
const element = document.getElementById('levelCheck')
const data = currentUrl.split('/')
console.log(data)

if (data[3] == 'admins') {
    element.textContent = 'Администратор'
} else {
    element.textContent = 'Ошибка'
}

if ('ontouchstart' in window) {
    document.body.style.touchAction = 'manipulation'

    const buttons = document.querySelectorAll(
        'button, .student-header, .toggle-btn'
    )
    buttons.forEach(btn => {
        btn.addEventListener(
            'touchstart',
            function() {
                this.style.opacity = '0.7'
            }, { passive: true }
        )
        btn.addEventListener('touchend', function() {
            this.style.opacity = '1'
        })
        btn.addEventListener('touchcancel', function() {
            this.style.opacity = '1'
        })
    })
}

document.addEventListener('DOMContentLoaded', function() {
    if ('ontouchstart' in window) {
        document.body.style.touchAction = 'manipulation'
    }

    const buttons = document.querySelectorAll('button, .year-item')
    buttons.forEach(btn => {
        btn.addEventListener(
            'touchstart',
            function() {
                this.style.opacity = '0.7'
            }, { passive: true }
        )
        btn.addEventListener('touchend', function() {
            this.style.opacity = '1'
        })
        btn.addEventListener('touchcancel', function() {
            this.style.opacity = '1'
        })
    })
})

const buttonExsel = document.getElementById('buttonOfExselFile')
const uploadForm = document.getElementById('uploadForm')

const circularProgressContainer = document.getElementById(
    'circularProgressContainer'
)
const progressCircle = document.querySelector('.progress-circle')
const percentValue = document.querySelector('.percent-value')
const progressStatusText = document.querySelector('.progress-status-text')

let progressSection = document.querySelector('.progress-section')
if (!progressSection) {
    progressSection = document.createElement('div')
    progressSection.className = 'progress-section'
    progressSection.innerHTML = `
        <div class="progress-header">
            <span class="progress-label">Прогресс импорта</span>
        </div>
        <div class="progress-bar-container">
            <div class="progress-bar">0%</div>
        </div>
        <div class="status-message"></div>
        <div class="results"></div>
    `
    uploadForm.appendChild(progressSection)
}

const progressBar = progressSection.querySelector('.progress-bar')
const progressPercent = progressSection.querySelector('.progress-percent')
const statusMessageDiv = progressSection.querySelector('.status-message')
const resultsDiv = progressSection.querySelector('.results')

function updateCircularProgress(percent) {
    if (!progressCircle) return

    const radius = 45
    const circumference = 2 * Math.PI * radius

    const offset = circumference - (percent / 100) * circumference

    progressCircle.style.strokeDasharray = circumference
    progressCircle.style.strokeDashoffset = offset

    if (percentValue) {
        percentValue.textContent = `${Math.round(percent)}%`
    }
}

function updateProgress(percent, message, data = null) {
    const roundedPercent = Math.round(percent)

    updateCircularProgress(roundedPercent)

    if (progressBar) {
        progressBar.style.width = `${roundedPercent}%`
        progressBar.textContent = `${roundedPercent}%`
    }
    if (progressPercent) {
        progressPercent.textContent = `${roundedPercent}%`
    }

    if (message && progressStatusText) {
        progressStatusText.textContent = message
    }

    if (percent >= 100) {
        if (circularProgressContainer) {
            circularProgressContainer.classList.remove('processing')
        }
        if (progressStatusText) {
            progressStatusText.textContent = '✅ Импорт завершен!'
        }
        setTimeout(() => {
            if (statusMessageDiv) {
                statusMessageDiv.innerHTML = `
                    <div class="status-message status-success">
                        <span>✅</span>
                        <span>Импорт успешно завершен!</span>
                    </div>
                `
            }
            loadYears()
        }, 500)
    } else if (percent > 0 && percent < 100) {
        if (circularProgressContainer) {
            circularProgressContainer.classList.add('processing')
        }
    }

    if (data && data.success !== undefined) {
        showResults(data)
    }
}

function showResults(result) {
    const successRate =
        result.total > 0 ? Math.round((result.success / result.total) * 100) : 0

    resultsDiv.innerHTML = `
        <div class="result-card">
            <div class="result-title">📈 Результаты импорта</div>
            <div class="result-stats">
                <div class="stat-item">
                    <div class="stat-value">${result.total}</div>
                    <div class="stat-label">Всего учеников</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" style="color: #22c55e;">${
                      result.success
                    }</div>
                    <div class="stat-label">Успешно</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" style="color: #ef4444;">${
                      result.errors.length
                    }</div>
                    <div class="stat-label">Ошибок</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${successRate}%</div>
                    <div class="stat-label">Успешность</div>
                </div>
            </div>
            ${
              result.newSubjects && result.newSubjects.length > 0
                ? `
                <div style="margin-top: 8px; font-size: 11px; color: #667eea;">
                    📚 Добавлено новых предметов: ${result.newSubjects.length}
                </div>
            `
                : ''
            }
            ${
              result.errors.length > 0
                ? `
                <div class="error-list">
                    <strong>⚠️ Ошибки (первые 5):</strong>
                    ${result.errors
                      .slice(0, 5)
                      .map(
                        err => `
                        <div class="error-item">
                            ${err.student}: ${err.error}
                        </div>
                    `
                      )
                      .join('')}
                    ${
                      result.errors.length > 5
                        ? `<div class="error-item">... и еще ${
                            result.errors.length - 5
                          } ошибок</div>`
                        : ''
                    }
                </div>
            `
                : ''
            }
        </div>
    `
  resultsDiv.style.display = 'block'
}

function resetProgress () {
  updateCircularProgress(0)
  if (progressStatusText) {
    progressStatusText.textContent = 'Ожидание'
  }
  if (circularProgressContainer) {
    circularProgressContainer.classList.remove('processing')
  }

  if (progressBar) {
    progressBar.style.width = '0%'
    progressBar.textContent = '0%'
  }
  if (progressPercent) {
    progressPercent.textContent = '0%'
  }
  if (statusMessageDiv) {
    statusMessageDiv.innerHTML = ''
  }
  if (resultsDiv) {
    resultsDiv.innerHTML = ''
    resultsDiv.style.display = 'none'
  }
  if (progressSection) {
    progressSection.style.display = 'none'
  }
}

uploadForm.addEventListener('submit', async e => {
  e.preventDefault()

  const fileInput = document.getElementById('excelFile')
  const file = fileInput.files[0]

  if (!file) {
    alert('Выберите файл')
    return
  }

  const formData = new FormData()
  formData.append('file', file)

  if (circularProgressContainer) {
    circularProgressContainer.style.display = 'flex'
  }
  if (progressSection) {
    progressSection.style.display = 'block'
  }

  updateCircularProgress(0)
  if (progressStatusText) {
    progressStatusText.textContent = 'Начинаем импорт...'
  }
  if (progressBar) {
    progressBar.style.width = '0%'
    progressBar.textContent = '0%'
  }
  if (progressPercent) {
    progressPercent.textContent = '0%'
  }
  if (statusMessageDiv) {
    statusMessageDiv.innerHTML = ''
  }
  if (resultsDiv) {
    resultsDiv.innerHTML = ''
    resultsDiv.style.display = 'none'
  }

  const submitButton = document.getElementById('buttonOfExselFile')
  submitButton.disabled = true
  submitButton.textContent = 'Импорт...'

  try {
    const response = await fetch(`${url}import/students/progress`, {
      method: 'POST',
      body: formData
    })

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')

      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.progress !== undefined) {
              updateProgress(data.progress, data.message, data.data)
            } else if (data.error) {
              updateCircularProgress(0)
              if (progressStatusText) {
                progressStatusText.textContent = '❌ ' + data.error
              }
              if (statusMessageDiv) {
                statusMessageDiv.innerHTML = `
                                    <div class="status-message status-error">
                                        <span>❌</span>
                                        <span>${data.error}</span>
                                    </div>
                                `
              }
            }
          } catch (err) {
            console.error('Ошибка парсинга:', err)
          }
        }
      }
    }
  } catch (error) {
    console.error('Ошибка при отправке:', error)
    updateCircularProgress(0)
    if (progressStatusText) {
      progressStatusText.textContent = '❌ Ошибка соединения'
    }
    if (statusMessageDiv) {
      statusMessageDiv.innerHTML = `
                <div class="status-message status-error">
                    <span>❌</span>
                    <span>Ошибка соединения с сервером: ${error.message}</span>
                </div>
            `
    }
  } finally {
    submitButton.disabled = false
    submitButton.textContent = 'Загрузить'
    if (circularProgressContainer) {
      circularProgressContainer.classList.remove('processing')
    }
  }
})

const addYear = document.getElementById('addForYear')
const closeFormYear = document.getElementById('buttonCloseFormExsel')
const formOfExsel = document.querySelector('.formOfExsel')
const formAdd = document.getElementById('uploadForm')

addYear.addEventListener('click', () => {
  formOfExsel.classList.add('active')
  if (circularProgressContainer) {
    circularProgressContainer.style.display = 'flex'
  }
})

closeFormYear.addEventListener('click', () => {
  formOfExsel.classList.remove('active')
  if (circularProgressContainer) {
    circularProgressContainer.style.display = 'none'
  }
  resetProgress()
})

formOfExsel.addEventListener('click', e => {
  if (e.target === formOfExsel) {
    formOfExsel.classList.remove('active')
    if (circularProgressContainer) {
      circularProgressContainer.style.display = 'none'
    }
    resetProgress()
  }
})

let currentYearId = null
const deleteModal = document.getElementById('deleteModal')
const confirmDeleteBtn = document.getElementById('confirmDelete')
const cancelDeleteBtn = document.getElementById('cancelDelete')

function closeDeleteModal () {
  deleteModal.classList.remove('active')
  currentYearId = null
}

function openDeleteModal (yearId) {
  currentYearId = yearId
  deleteModal.classList.add('active')
}

async function deleteYear (yearId) {
  try {
    const token = localStorage.getItem('adminToken')

    const response = await fetch(`${url}years/${yearId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    })

    const result = await response.json()

    if (response.ok) {
      showNotification('✅ Учебный год успешно удален', 'success')
      await loadYears()
    } else {
      showNotification(
        '❌ Ошибка при удалении: ' + (result.message || 'Неизвестная ошибка'),
        'error'
      )
    }
  } catch (error) {
    console.error('Ошибка при удалении:', error)
    showNotification('❌ Ошибка соединения с сервером', 'error')
  } finally {
    closeDeleteModal()
  }
}

function showNotification (message, type = 'info') {
  const notification = document.createElement('div')
  notification.className = `notification notification-${type}`
  notification.innerHTML = `
        <span>${message}</span>
        <button class="notification-close">×</button>
    `
  notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 500;
        z-index: 3000;
        animation: slideInRight 0.3s ease;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        background: ${type === 'success' ? '#dcfce7' : '#fee2e2'};
        color: ${type === 'success' ? '#166534' : '#991b1b'};
        border-left: 4px solid ${type === 'success' ? '#22c55e' : '#ef4444'};
        display: flex;
        align-items: center;
        gap: 12px;
    `

  const closeBtn = notification.querySelector('.notification-close')
  closeBtn.style.cssText = `
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: inherit;
        padding: 0 5px;
    `

  closeBtn.onclick = () => notification.remove()

  document.body.appendChild(notification)

  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'slideOutRight 0.3s ease'
      setTimeout(() => notification.remove(), 300)
    }
  }, 3000)
}

async function loadYears () {
  const renderYear = document.getElementById('yearRender')
  try {
    const response = await fetch(`${url}years/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    const yearsData = await response.json()
    console.log(yearsData)
    renderYear.innerHTML = ''

    if (yearsData.data && yearsData.data.length > 0) {
      yearsData.data.forEach(yearObject => {
        renderYear.innerHTML += `
                    <div class="year-item" data-year-id="${yearObject.id}">
                        <p>📅 ${yearObject.year}</p>
                        <button class="delete-year-btn" data-id="${yearObject.id}">
                            <img src="../img/Закрыть 1.svg" alt="Удалить">
                        </button>
                    </div>
                `
      })

      document.querySelectorAll('.year-item').forEach(item => {
        item.addEventListener('click', e => {
          if (e.target.closest('.delete-year-btn')) return

          const yearText = item
            .querySelector('p')
            ?.textContent.replace('📅 ', '')
          window.location.href = `pages/year.html?year=${encodeURIComponent(
            yearText
          )}`
        })
      })

      document.querySelectorAll('.delete-year-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation()
          const yearId = parseInt(btn.dataset.id)
          openDeleteModal(yearId)
        })
      })
    } else {
      renderYear.innerHTML =
        '<p style="color: #666; text-align: center; padding: 20px;">Нет добавленных годов</p>'
    }
  } catch (error) {
    console.error('Ошибка загрузки годов:', error)
    renderYear.innerHTML =
      '<p style="color: #ef4444; text-align: center; padding: 20px;">❌ Ошибка загрузки данных</p>'
  }
}

confirmDeleteBtn.addEventListener('click', () => {
  if (currentYearId) {
    deleteYear(currentYearId)
  }
})

cancelDeleteBtn.addEventListener('click', closeDeleteModal)

deleteModal.addEventListener('click', e => {
  if (e.target === deleteModal) {
    closeDeleteModal()
  }
})

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && deleteModal.classList.contains('active')) {
    closeDeleteModal()
  }
})

const style = document.createElement('style')
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`
document.head.appendChild(style)

document.addEventListener('DOMContentLoaded', async () => {
  await loadYears()
})

const helpWrapper = document.querySelector('.help-icon-wrapper')
let mobileTooltipTimeout = null

if (helpWrapper) {
  helpWrapper.addEventListener('touchstart', e => {
    e.stopPropagation()
    const tooltip = helpWrapper.querySelector('.tooltip-box')

    if (tooltip && tooltip.style.visibility === 'visible') {
      e.preventDefault()
      tooltip.style.visibility = 'hidden'
      tooltip.style.opacity = '0'
      return
    }

    if (tooltip) {
      tooltip.style.visibility = 'visible'
      tooltip.style.opacity = '1'

      if (mobileTooltipTimeout) clearTimeout(mobileTooltipTimeout)
      mobileTooltipTimeout = setTimeout(() => {
        tooltip.style.visibility = 'hidden'
        tooltip.style.opacity = '0'
      }, 5000)
    }
  })

  window.addEventListener('scroll', () => {
    const tooltip = helpWrapper.querySelector('.tooltip-box')
    if (tooltip) {
      tooltip.style.visibility = 'hidden'
      tooltip.style.opacity = '0'
    }
  })
}

document.addEventListener('touchstart', e => {
  if (!helpWrapper?.contains(e.target)) {
    const tooltip = helpWrapper?.querySelector('.tooltip-box')
    if (tooltip) {
      tooltip.style.visibility = 'hidden'
      tooltip.style.opacity = '0'
    }
  }
})