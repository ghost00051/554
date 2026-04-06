const gradesCache = new Map()
const recommendationsCache = new Map()
let globalYearId = null
let classesMap = new Map()
let globalSubjectsList = []
let currentOpenCard = null
import { url } from '../base.js'

function showNotification(message, type = 'info') {
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
        background: ${
          type === 'success'
            ? '#dcfce7'
            : type === 'warning'
            ? '#fef3c7'
            : '#fee2e2'
        };
        color: ${
          type === 'success'
            ? '#166534'
            : type === 'warning'
            ? '#92400e'
            : '#991b1b'
        };
        border-left: 4px solid ${
          type === 'success'
            ? '#22c55e'
            : type === 'warning'
            ? '#f59e0b'
            : '#ef4444'
        };
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

const notificationStyle = document.createElement('style')
notificationStyle.textContent = `
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
document.head.appendChild(notificationStyle)

function getGradeClass(grade) {
    const numGrade = parseFloat(grade)
    if (isNaN(numGrade)) return ''
    if (numGrade >= 4.5) return 'grade-excellent'
    if (numGrade >= 3.5) return 'grade-good'
    if (numGrade >= 2.5) return 'grade-satisfactory'
    return 'grade-poor'
}

async function fetchStudentRecommendations(studentId, studentName) {
    if (recommendationsCache.has(studentId)) {
        return recommendationsCache.get(studentId)
    }

    try {
        const response = await fetch(
            `${url}recommendations/student/${studentId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        )

        const result = await response.json()

        if (!response.ok || !result.success) {
            recommendationsCache.set(studentId, null)
            return null
        }

        recommendationsCache.set(studentId, result.data)
        return result.data
    } catch (error) {
        console.error(`Ошибка загрузки рекомендаций для ${studentName}:`, error)
        recommendationsCache.set(studentId, null)
        return null
    }
}

async function fetchStudentGrades(studentId, studentName) {
    if (gradesCache.has(studentId)) {
        return gradesCache.get(studentId)
    }

    try {
        const response = await fetch(
            `${url}students/${studentId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        )

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()

        if (!result.success || !result.data) {
            throw new Error('Некорректный ответ сервера')
        }

        const formattedGrades = {}
        if (result.data.grades && result.data.grades.length > 0) {
            result.data.grades.forEach(grade => {
                if (!formattedGrades[grade.subject]) {
                    formattedGrades[grade.subject] = []
                }
                formattedGrades[grade.subject].push(grade.grade)
            })
        }

        gradesCache.set(studentId, formattedGrades)
        return formattedGrades
    } catch (error) {
        console.error(`Ошибка загрузки оценок для ${studentName}:`, error)
        showNotification(
            `❌ Не удалось загрузить оценки для ${studentName}: ${error.message}`,
            'error'
        )
        return {}
    }
}

function renderRecommendations(recommendations) {
    if (!recommendations) return ''

    let html = `
        <div class="recommendations-section" style="margin-top: 15px; padding: 15px; background: linear-gradient(135deg, #f0f4ff, #e8edff); border-radius: 12px; border-left: 4px solid #667eea;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                <span style="font-size: 20px;">🎯</span>
                <strong style="color: #4a5568; font-size: 14px;">Рекомендация по профилю:</strong>
            </div>
    `

    if (recommendations.recommended_class_name) {
        html += `
            <div style="margin-bottom: 10px;">
                <span style="color: #667eea; font-weight: 600;">Рекомендуемый класс:</span>
                <span style="margin-left: 10px; background: #667eea; color: white; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 500;">
                    ${escapeHtml(recommendations.recommended_class_name)}
                </span>
            </div>
        `
    }

    if (recommendations.total_score) {
        html += `
            <div style="margin-bottom: 10px;">
                <span style="color: #667eea; font-weight: 600;">Общий балл:</span>
                <span style="margin-left: 10px; font-weight: 600; color: #764ba2;">${recommendations.total_score.toFixed(
                  2
                )}</span>
            </div>
        `
    }

    if (recommendations.details) {
        const details = recommendations.details
        if (details.normalizedGrade) {
            html += `
                <div style="margin-bottom: 10px;">
                    <span style="color: #667eea; font-weight: 600;">Средний балл:</span>
                    <span style="margin-left: 10px;">${details.normalizedGrade.toFixed(
                      2
                    )}</span>
                </div>
            `
        }

        if (details.weights) {
            html += `
                <div style="margin-bottom: 10px; font-size: 12px; color: #666;">
                    <span>📊 Веса: Успеваемость ${
                      details.weights.academicPerformance * 100
                    }% / Рекомендации ${
        details.weights.teacherRecommendation * 100
      }%</span>
                </div>
            `
        }

        if (details.subjectGrades && details.subjectGrades.length > 0) {
            const topSubjects = details.subjectGrades.slice(0, 3)
            html += `
                <div style="margin-top: 10px;">
                    <div style="font-size: 12px; color: #666; margin-bottom: 8px;">🏆 Лучшие предметы:</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${topSubjects
                          .map(
                            subj => `
                            <span style="background: white; padding: 4px 10px; border-radius: 15px; font-size: 11px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                                ${escapeHtml(subj.subject)}: ${subj.grade}
                            </span>
                        `
                          )
                          .join('')}
                    </div>
                </div>
            `
    }
  }

  html += `</div>`
  return html
}

async function loadClasses (yearGetId) {
  if (!yearGetId) {
    console.error('yearGetId не передан или равен undefined')
    return
  }
  try {
    const response = await fetch(
      `${url}/years/${yearGetId}/classes`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
    const classData = await response.json()
    console.log('Классы:', classData)

    if (classData.data && classData.data.length > 0) {
      classData.data.forEach(cls => {
        classesMap.set(cls.id, cls.name)
      })
    }
    console.log('Map классов:', Array.from(classesMap.entries()))
  } catch (error) {
    console.error('Ошибка загрузки классов:', error)
    showNotification('❌ Ошибка загрузки классов', 'error')
  }
}

async function loadPeople () {
  const renderPeople = document.getElementById('renderStudens')
  const studentCountSpan = document.getElementById('studentCount')
  const levelCheckSpan = document.getElementById('levelCheck')

  try {
    const subjectsResponse = await fetch(
      `${url}/subjects`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
    const subjectsData = await subjectsResponse.json()
    globalSubjectsList = subjectsData.data || []
    console.log(
      'Загружены реальные предметы:',
      globalSubjectsList.map(s => s.name)
    )

    const studentResponse = await fetch(
      `${url}students/?limit=1000`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    if (!studentResponse.ok) {
      throw new Error(`HTTP error! status: ${studentResponse.status}`)
    }

    const studentData = await studentResponse.json()
    console.log('Students:', studentData)

    globalYearId =
      studentData.data && studentData.data[0]
        ? studentData.data[0].academic_year_id
        : undefined
    console.log('Year ID:', globalYearId)

    await loadClasses(globalYearId)

    const students = studentData.data || studentData.students || []

    studentCountSpan.textContent = `${students.length} студентов`
    levelCheckSpan.textContent = 'Администратор'

    if (students.length === 0) {
      renderPeople.innerHTML = `<div class="loading-spinner">📭 Нет данных о студентах</div>`
      return
    }

    const studentsByClass = new Map()

    students.forEach(student => {
      const classId = student.class_id
      if (!studentsByClass.has(classId)) {
        studentsByClass.set(classId, [])
      }
      studentsByClass.get(classId).push(student)
    })

    console.log('Студенты по классам:', studentsByClass)

    renderPeople.innerHTML = ''

    const sortedClasses = Array.from(studentsByClass.keys()).sort((a, b) => {
      const nameA = classesMap.get(a) || `Класс ${a}`
      const nameB = classesMap.get(b) || `Класс ${b}`
      return nameA.localeCompare(nameB)
    })

    for (const classId of sortedClasses) {
      const classStudents = studentsByClass.get(classId)
      const className = classesMap.get(classId) || `Класс ${classId}`

      const classBlock = document.createElement('div')
      classBlock.className = 'class-block'
      classBlock.style.marginBottom = '30px'

      const classHeader = document.createElement('div')
      classHeader.className = 'class-header'
      classHeader.innerHTML = `
                <div class="class-title">
                    <span class="class-icon">🏫</span>
                    <h2>${escapeHtml(className)} класс</h2>
                    <span class="class-count">${
                      classStudents.length
                    } учеников</span>
                </div>
            `
      classHeader.style.cssText = `
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
                padding: 15px 20px;
                border-radius: 15px 15px 0 0;
                margin-bottom: 10px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            `

      classBlock.appendChild(classHeader)

      const studentsContainer = document.createElement('div')
      studentsContainer.className = 'students-container'

      for (const student of classStudents) {
        const studentId = student.id
        const fullName =
          student.full_name ||
          student.name ||
          student.fullName ||
          `Студент ${studentId}`

        const card = document.createElement('div')
        card.className = 'people-item'
        card.style.marginBottom = '10px'
        card.style.borderRadius = '12px'
        card.dataset.studentId = studentId

        const header = document.createElement('div')
        header.className = 'student-header'

        const nameSpan = document.createElement('div')
        nameSpan.className = 'student-name'
        nameSpan.textContent = fullName

        const toggleBtn = document.createElement('button')
        toggleBtn.className = 'toggle-btn'
        toggleBtn.innerHTML = '📊 Показать оценки и рекомендации <span>▼</span>'

        header.appendChild(nameSpan)
        header.appendChild(toggleBtn)

        const gradesContainer = document.createElement('div')
        gradesContainer.className = 'grades-content'

        const gradesInner = document.createElement('div')
        gradesInner.className = 'grades-table'
        gradesInner.innerHTML =
          '<div style="text-align:center; padding:20px;">⏳ Загрузка данных...</div>'
        gradesContainer.appendChild(gradesInner)

        card.appendChild(header)
        card.appendChild(gradesContainer)

        let isOpen = false
        let dataLoaded = false

        const loadAndShowData = async () => {
          if (!dataLoaded) {
            gradesInner.innerHTML =
              '<div style="text-align:center; padding:20px;">📖 Загрузка успеваемости и рекомендаций...</div>'

            const [grades, recommendations] = await Promise.all([
              fetchStudentGrades(studentId, fullName),
              fetchStudentRecommendations(studentId, fullName)
            ])

            let html = ''

            html += '<div class="grades-block">'
            html +=
              '<div style="font-weight: 600; margin-bottom: 15px; color: #4a5568;">📚 Успеваемость</div>'

            if (Object.keys(grades).length === 0) {
              html +=
                '<div class="no-grades" style="margin-bottom: 20px;">✨ Нет данных об оценках</div>'
              showNotification(
                `ℹ️ У студента ${fullName} нет оценок`,
                'warning'
              )
            } else {
              for (const [subject, gradeList] of Object.entries(grades)) {
                if (gradeList && gradeList.length > 0) {
                  html += `
                                        <div class="subject-row">
                                            <div class="subject-name">${escapeHtml(
                                              subject
                                            )}</div>
                                            <div class="grades-list">
                                                ${gradeList
                                                  .map(grade => {
                                                    const gradeNum =
                                                      parseFloat(grade).toFixed(
                                                        1
                                                      )
                                                    const gradeClass =
                                                      getGradeClass(gradeNum)
                                                    return `<span class="grade-badge ${gradeClass}">${gradeNum}</span>`
                                                  })
                                                  .join('')}
                                            </div>
                                        </div>
                                    `
                }
              }
            }
            html += '</div>'

            if (recommendations) {
              html += renderRecommendations(recommendations)
            } else {
              html += `
                                <div class="no-recommendations" style="margin-top: 15px; padding: 12px; background: #fef3c7; border-radius: 12px; border-left: 4px solid #f59e0b;">
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <span>⚠️</span>
                                        <span style="color: #92400e; font-size: 13px;">Нет рекомендаций по профилю для этого студента</span>
                                    </div>
                                </div>
                            `
              showNotification(
                `ℹ️ Для студента ${fullName} нет рекомендаций`,
                'warning'
              )
            }

            gradesInner.innerHTML = html
            dataLoaded = true
          }
        }

        toggleBtn.addEventListener('click', async e => {
          e.stopPropagation()

          if (isOpen) {
            gradesContainer.classList.remove('show')
            toggleBtn.innerHTML =
              '📊 Показать оценки и рекомендации <span>▼</span>'
            isOpen = false
            currentOpenCard = null

            card.style.transition = 'all 0.3s ease'
            card.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)'
          } else {
            if (currentOpenCard && currentOpenCard !== card) {
              const prevGradesContainer =
                currentOpenCard.querySelector('.grades-content')
              const prevToggleBtn = currentOpenCard.querySelector('.toggle-btn')
              if (prevGradesContainer) {
                prevGradesContainer.classList.remove('show')
              }
              if (prevToggleBtn) {
                prevToggleBtn.innerHTML =
                  '📊 Показать оценки и рекомендации <span>▼</span>'
              }
              if (currentOpenCard._isOpen) {
                currentOpenCard._isOpen = false
              }
              currentOpenCard.style.transition = 'all 0.3s ease'
              currentOpenCard.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)'
            }

            await loadAndShowData()
            gradesContainer.classList.add('show')
            toggleBtn.innerHTML =
              '📈 Скрыть оценки и рекомендации <span>▲</span>'
            isOpen = true
            card._isOpen = true
            currentOpenCard = card

            card.style.transition = 'all 0.3s ease'
            card.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.3)'

            setTimeout(() => {
              requestAnimationFrame(() => {
                card.scrollIntoView({
                  behavior: 'smooth',
                  block: 'center',
                  inline: 'nearest'
                })

                setTimeout(() => {
                  card.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                    inline: 'nearest'
                  })
                }, 50)
              })

              setTimeout(() => {
                card.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)'
              }, 1500)
            }, 200)
          }
        })

        studentsContainer.appendChild(card)
      }

      classBlock.appendChild(studentsContainer)
      renderPeople.appendChild(classBlock)
    }
  } catch (error) {
    console.error('Error:', error)
    renderPeople.innerHTML = `
            <div class="loading-spinner" style="background: rgba(255,255,255,0.9); color: #333; border-radius: 20px;">
                ⚠️ Ошибка загрузки данных: ${error.message}<br>
                <small>Проверьте соединение с сервером</small>
            </div>
        `
    levelCheckSpan.textContent = 'Ошибка соединения'
    showNotification(`❌ Ошибка загрузки данных: ${error.message}`, 'error')
  }
}

function escapeHtml (text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadPeople()
})