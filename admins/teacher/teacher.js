import { url } from '../base.js'

const API_BASE = url

let currentYearId = null
let currentClassId = null
let currentProfile = 'physmath'
let yearsList = []
let classesMap = new Map()
let studentsData = []

const gradesCache = new Map()

const profileSelect = document.getElementById('profileSelect')
const yearSelect = document.getElementById('yearSelect')
const classSelect = document.getElementById('classSelect')
const studentsContainer = document.getElementById('studentsContainer')
const statsInfo = document.getElementById('statsInfo')

function showToast(message, type = 'info') {
    const toast = document.createElement('div')
    toast.className = 'notification-toast'
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        z-index: 9999;
        font-size: 14px;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        animation: fadeIn 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `
    toast.innerHTML = message
    document.body.appendChild(toast)
    setTimeout(() => toast.remove(), 2800)
}

function getProfileSubjects(profile) {
    if (profile === 'physmath') {
        return ['Алгебра', 'Физика', 'Информатика']
    } else {
        return ['Биология', 'Введение в химию']
    }
}

async function loadYears() {
    try {
        const response = await fetch(`${API_BASE}years/`)
        if (!response.ok) throw new Error('HTTP error')
        const data = await response.json()
        yearsList = data.data || data.years || []

        console.log('Загружены годы:', yearsList)

        yearSelect.innerHTML = '<option value="">-- Выберите год --</option>'
        yearsList.forEach(y => {
            const yearName = y.year || y.year_name || y.name || `Год ${y.id}`
            yearSelect.innerHTML += `<option value="${y.id}">${yearName}</option>`
        })
        yearSelect.disabled = false

        if (yearsList.length > 0) {
            const activeYear =
                yearsList.find(y => y.is_active === true) || yearsList[0]
            if (activeYear) {
                yearSelect.value = activeYear.id
                currentYearId = activeYear.id
                await loadClassesForYear(currentYearId)
            }
        }
    } catch (err) {
        console.error('Ошибка загрузки годов:', err)
        yearSelect.innerHTML = '<option>Ошибка загрузки</option>'
        showToast('Ошибка загрузки списка годов', 'error')
    }
}

async function loadClassesForYear(yearId) {
    if (!yearId) {
        classSelect.innerHTML = '<option value="">Сначала выберите год</option>'
        classSelect.disabled = true
        currentClassId = null
        return
    }
    try {
        const resp = await fetch(`${API_BASE}years/${yearId}/classes`)
        if (!resp.ok) throw new Error()
        const json = await resp.json()
        const classes = json.data || json.classes || []

        console.log('Загружены классы для года', yearId, ':', classes)

        classesMap.clear()
        classes.forEach(cls => {
            classesMap.set(cls.id, cls.name)
        })
        classSelect.innerHTML = '<option value="">-- Выберите класс --</option>'
        classes.forEach(cls => {
            classSelect.innerHTML += `<option value="${cls.id}">${cls.name}</option>`
        })
        classSelect.disabled = false

        if (classes.length > 0) {
            classSelect.value = classes[0].id
            currentClassId = classes[0].id
            await loadStudents(currentYearId, currentClassId)
        }
    } catch (err) {
        console.error('Ошибка загрузки классов:', err)
        classSelect.innerHTML = '<option>Ошибка</option>'
        showToast('Ошибка загрузки списка классов', 'error')
    }
}

async function loadStudents(yearId, classId) {
    if (!yearId || !classId) {
        studentsContainer.innerHTML = `<div class="empty-state">📌 Выберите учебный год и класс</div>`
        statsInfo.innerText = `👩‍🎓 Студенты: 0`
        return
    }
    studentsContainer.innerHTML = `<div class="empty-state">⏳ Загрузка студентов...</div>`
    try {
        const query = `${API_BASE}students/?academicYearId=${yearId}&classId=${classId}&limit=200`
        console.log('Загрузка студентов:', query)
        const resp = await fetch(query)
        if (!resp.ok) throw new Error()
        const json = await resp.json()
        const students = json.data || json.students || []

        console.log('Загружены студенты:', students.length)

        studentsData = students
        statsInfo.innerText = `👩‍🎓 Студенты: ${students.length}`

        if (students.length === 0) {
            studentsContainer.innerHTML = `<div class="empty-state">📭 В этом классе пока нет учеников</div>`
            return
        }
        await renderStudentsWithSubjects(students)
    } catch (err) {
        console.error(err)
        studentsContainer.innerHTML = `<div class="empty-state">⚠️ Ошибка загрузки списка студентов</div>`
        showToast('Ошибка загрузки списка студентов', 'error')
    }
}

async function fetchStudentGrades(studentId) {
    if (gradesCache.has(studentId)) return gradesCache.get(studentId)
    try {
        const resp = await fetch(`${API_BASE}students/${studentId}`)
        if (!resp.ok) throw new Error()
        const json = await resp.json()
        const gradesArr = (json.data && json.data.grades) || json.grades || []
        const gradesData = {}
        gradesArr.forEach(g => {
            if (!gradesData[g.subject]) gradesData[g.subject] = []
            gradesData[g.subject].push(g.grade)
        })
        gradesCache.set(studentId, gradesData)
        return gradesData
    } catch (err) {
        console.error(`Ошибка загрузки оценок студента ${studentId}`, err)
        return {}
    }
}

async function sendRecommendationsBatch(studentId, recommendations) {
    const payload = {
        recommendations: recommendations.map(rec => ({
            studentId: studentId,
            subjectId: rec.subjectId,
            score: rec.score,
            comment: rec.comment
        }))
    }

    try {
        const resp = await fetch(`${API_BASE}recommendations/teacher/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        if (resp.ok) {
            const result = await resp.json()
            console.log('Рекомендации сохранены:', result)
            return true
        } else {
            throw new Error()
        }
    } catch (err) {
        console.error('Ошибка отправки рекомендаций', err)
        return false
    }
}

async function recalcStudentRecommendation(studentId) {
    try {
        showToast('🔄 Пересчет рекомендации...', 'info')
        const resp = await fetch(
            `${API_BASE}recommendations/student/${studentId}/calculate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            }
        )

        if (resp.ok) {
            const result = await resp.json()
            if (result.success) {
                showToast(`✅ Рекомендация пересчитана!`, 'success')
                if (currentYearId && currentClassId) {
                    await loadStudents(currentYearId, currentClassId)
                }
            } else {
                showToast(`❌ Ошибка: ${result.error || 'Неизвестная ошибка'}`, 'error')
            }
        } else {
            throw new Error('HTTP error')
        }
    } catch (err) {
        console.error('Ошибка пересчета:', err)
        showToast(`❌ Ошибка пересчета`, 'error')
    }
}

async function renderStudentsWithSubjects(students) {
    studentsContainer.innerHTML = ''
    const profileSubjects = getProfileSubjects(currentProfile)

    const subjectsMap = {
        Алгебра: 7,
        Геометрия: 11,
        Математика: 1,
        Физика: 3,
        Информатика: 14,
        Биология: 5,
        Химия: 4,
        'Введение в химию': 8
    }

    for (const student of students) {
        const studentId = student.id
        const fullName =
            student.full_name ||
            student.name ||
            student.fullName ||
            `Ученик ${studentId}`
        const gradesObj = await fetchStudentGrades(studentId)

        let existingRecommendation = null
        let profileName = ''
        let totalScore = 0

        try {
            const recResp = await fetch(
                `${API_BASE}recommendations/student/${studentId}`
            )
            if (recResp.ok) {
                const recData = await recResp.json()
                if (recData.success && recData.data) {
                    existingRecommendation = recData.data
                    profileName =
                        (existingRecommendation.details &&
                            existingRecommendation.details.recommended_class_name) ||
                        existingRecommendation.recommended_class_name ||
                        (existingRecommendation.total_score >= 7 ?
                            'Физико-математический' :
                            'Химико-биологический')
                }
            }
        } catch (e) {
            console.log('Нет рекомендации для студента', studentId)
        }

        const card = document.createElement('div')
        card.className = 'student-card'
        card.dataset.studentId = studentId

        const headerDiv = document.createElement('div')
        headerDiv.className = 'student-header'
        headerDiv.innerHTML = `<div class="student-name">${escapeHtml(
      fullName
    )}</div>
                               <button class="toggle-details">📊 Показать предметы <span>▼</span></button>`

        if (profileName && totalScore > 0) {
            const recBlock = document.createElement('div')
            recBlock.className = 'final-recommendation'
            recBlock.style.cssText = `
                margin: 10px 15px;
                padding: 8px 12px;
                border-radius: 8px;
                background: ${
                  profileName === 'Физико-математический'
                    ? '#e3f2fd'
                    : '#e8f5e9'
                };
                border-left: 4px solid ${
                  profileName === 'Физико-математический'
                    ? '#1976d2'
                    : '#388e3c'
                };
                font-size: 13px;
                font-weight: 500;
            `
            const scoreDisplay =
                typeof totalScore === 'number' && !isNaN(totalScore) ?
                totalScore.toFixed(2) :
                totalScore.toString()
            recBlock.innerHTML = `
                🎓 <strong>Текущая рекомендация:</strong> ${profileName} 
                <span style="color: #666;">(балл: ${scoreDisplay})</span>
                <button class="recalc-btn" style="margin-left: 10px; padding: 2px 8px; font-size: 11px; cursor: pointer;">🔄 Пересчитать</button>
            `

            const recalcBtn = recBlock.querySelector('.recalc-btn')
            if (recalcBtn) {
                recalcBtn.addEventListener('click', async e => {
                    e.stopPropagation()
                    await recalcStudentRecommendation(studentId)
                })
            }

            headerDiv.insertAdjacentElement('afterend', recBlock)
        }

        const detailsDiv = document.createElement('div')
        detailsDiv.className = 'student-details'

        let isOpen = false
        const toggleBtn = headerDiv.querySelector('.toggle-details')

        toggleBtn.addEventListener('click', async e => {
            e.stopPropagation()
            if (isOpen) {
                detailsDiv.classList.remove('open')
                toggleBtn.innerHTML = '📊 Показать предметы <span>▼</span>'
                isOpen = false
            } else {
                if (detailsDiv.children.length === 0) {
                    const contentDiv = document.createElement('div')
                    contentDiv.className = 'grades-recommendations'

                    let subjectsHtml = `<div class="subjects-table">
                                <h4>📖 Профильные предметы (${
                                  currentProfile === 'physmath'
                                    ? 'Физ-мат'
                                    : 'Хим-био'
                                })</h4>`

                    for (const subj of profileSubjects) {
                        const subjectId = subjectsMap[subj]
                        const studentGrades = gradesObj[subj] || []
                        const gradesHtml = studentGrades
                            .map(
                                g =>
                                `<span class="grade-badge ${getGradeClass(g)}">${Math.floor(
                    parseFloat(g)
                  )}</span>`
                            )
                            .join('')

                        let existingScore = ''
                        try {
                            const recResp = await fetch(
                                `${API_BASE}recommendations/teacher/student/${studentId}/subject/${subjectId}`
                            )
                            if (recResp.ok) {
                                const recData = await recResp.json()
                                if (
                                    recData.success &&
                                    recData.data &&
                                    recData.data.length > 0
                                ) {
                                    existingScore = recData.data[0].score
                                }
                            }
                        } catch (e) {}

                        subjectsHtml += `<div class="subject-row">
                                    <div class="subject-info">${escapeHtml(
                                      subj
                                    )}</div>
                                    <div class="grades-badge-list">${
                                      gradesHtml ||
                                      '<span class="grade-badge">—</span>'
                                    }</div>
                                    <div class="recommendation-field">
                                        <label>🎯 Рек. (0-10):</label>
                                        <input type="number" min="0" max="10" class="rec-input" 
                                               id="rec_${studentId}_${subjectId}" 
                                               data-subject-id="${subjectId}" 
                                               data-subject-name="${subj}" 
                                               value="${existingScore}" 
                                               placeholder="0-10">
                                    </div>
                                </div>`
                    }

                    subjectsHtml += `<div class="save-all-btn-container">
                                        <button class="save-all-rec-btn" data-student="${studentId}">💾 Сохранить все рекомендации</button>
                                    </div>
                                </div>`

                    contentDiv.innerHTML = subjectsHtml
                    detailsDiv.appendChild(contentDiv)

                    const saveAllBtn = contentDiv.querySelector('.save-all-rec-btn')
                    saveAllBtn.addEventListener('click', async() => {
                        const studId = parseInt(saveAllBtn.dataset.student)
                        const recommendations = []

                        for (const subj of profileSubjects) {
                            const subjectId = subjectsMap[subj]
                            const inputField = document.getElementById(
                                `rec_${studId}_${subjectId}`
                            )
                            let score = parseInt(inputField.value)
                            if (isNaN(score)) score = 0
                            score = Math.min(10, Math.max(0, score))

                            recommendations.push({
                                subjectId: subjectId,
                                score: score,
                                comment: `${subj} - рекомендация`
                            })
                        }

                        const success = await sendRecommendationsBatch(
                            studId,
                            recommendations
                        )
                        if (success) {
                            showToast(
                                `✅ Рекомендации для ${escapeHtml(fullName)} сохранены`,
                                'success'
                            )
                            setTimeout(() => {
                                if (currentYearId && currentClassId) {
                                    loadStudents(currentYearId, currentClassId)
                                }
                            }, 500)
                        } else {
                            showToast(`❌ Ошибка сохранения рекомендаций`, 'error')
                        }
                    })
                }
                detailsDiv.classList.add('open')
                toggleBtn.innerHTML = '📈 Скрыть оценки <span>▲</span>'
                isOpen = true
            }
        })

        card.appendChild(headerDiv)
        card.appendChild(detailsDiv)
        studentsContainer.appendChild(card)
    }
}

function getGradeClass(grade) {
    const num = parseInt(grade)
    if (isNaN(num)) return ''
    if (num >= 5) return 'grade-excellent'
    if (num >= 4) return 'grade-good'
    if (num >= 3) return 'grade-satisfactory'
    return 'grade-poor'
}

function escapeHtml(str) {
    if (!str) return ''
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;'
        if (m === '<') return '&lt;'
        if (m === '>') return '&gt;'
        return m
    })
}

yearSelect.addEventListener('change', async e => {
    const yearId = parseInt(e.target.value)
    currentYearId = yearId
    if (yearId) {
        await loadClassesForYear(yearId)
        classSelect.disabled = false
        classSelect.value = ''
        currentClassId = null
        studentsContainer.innerHTML = `<div class="empty-state">📌 Выберите класс</div>`
        statsInfo.innerText = `👩‍🎓 Студенты: 0`
    } else {
        classSelect.disabled = true
        classSelect.innerHTML = '<option value="">-- Выберите год --</option>'
        currentClassId = null
        studentsContainer.innerHTML = `<div class="empty-state">📆 Выберите учебный год</div>`
    }
})

classSelect.addEventListener('change', async e => {
    const classId = parseInt(e.target.value)
    currentClassId = classId
    if (currentYearId && classId) {
        await loadStudents(currentYearId, classId)
    }
})

profileSelect.addEventListener('change', e => {
    currentProfile = e.target.value
    if (currentYearId && currentClassId && studentsData.length) {
        renderStudentsWithSubjects(studentsData)
    } else if (currentYearId && currentClassId) {
        loadStudents(currentYearId, currentClassId)
    }
})

document.addEventListener('DOMContentLoaded', async() => {
    await loadYears()
})