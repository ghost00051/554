const API_URL ="http://ip вставь/api/";

const table = document.getElementById("studentsTable");
const errorDiv = document.getElementById("error");
const groupSelect = document.getElementById("group");
const subjectSelect = document.getElementById("subject");
const yearSelect = document.getElementById("year");
const saveBtn = document.getElementById("saveBtn");

let students = [];

const subjectMap = {
    "Алгебра": 7,
    "Физика": 3,
    "Информатика": 14,
    "Биология": 5,
    "Химия": 8
};

const groups = ["7А", "7Б", "7В", "7Г", "7Д"];

groups.forEach(g => {
    const opt = document.createElement("option");
    opt.value = g;
    opt.textContent = g;
    groupSelect.appendChild(opt);
});

function loadSubjects() {
    subjectSelect.innerHTML = "";

    Object.keys(subjectMap).forEach(sub => {
        const opt = document.createElement("option");
        opt.value = sub;
        opt.textContent = sub;
        subjectSelect.appendChild(opt);
    });

    subjectSelect.value = "Алгебра";
}

async function loadStudents() {
    try {
        const res = await fetch(API_URL + "students/?limit=1000");
        const data = await res.json();
        students = data.data || [];
        loadYears();
        render();
    } catch {
        errorDiv.innerText = "Ошибка загрузки учеников";
    }
}

function loadYears() {
    const years = [...new Set(students.map(s => s.academic_year))];
    yearSelect.innerHTML = "";

    years.forEach(y => {
        const opt = document.createElement("option");
        opt.value = y;
        opt.textContent = y;
        yearSelect.appendChild(opt);
    });

    if (years.length) {
        yearSelect.value = years[0];
    }
}

async function loadGrade(studentId, subjectName) {
    try {
        const res = await fetch(API_URL + `students/${studentId}`);
        const data = await res.json();

        const gradesArr = data.data?.grades || [];
        const subjectId = subjectMap[subjectName];

        const filtered = gradesArr.filter(g => g.subject_id === subjectId);

        if (!filtered.length) return "—";

        const avg = (
            filtered.reduce((sum, g) => sum + g.grade, 0) / filtered.length
        ).toFixed(2);

        return avg;
    } catch {
        return "—";
    }
}

function setRowColor(row, val) {
    if (val >= 7) row.className = "strong";
    else if (val >= 4) row.className = "medium";
    else if (val >= 1) row.className = "weak";
    else row.className = "";
}

async function render() {
    table.innerHTML = "";

    const group = groupSelect.value;
    const subject = subjectSelect.value;
    const year = yearSelect.value;

    const filtered = students.filter(s =>
        s.class_name === group &&
        s.academic_year === year
    );

    if (!filtered.length) {
        table.innerHTML = `<tr><td colspan="4">Нет учеников</td></tr>`;
        return;
    }

    for (const s of filtered) {
        const row = document.createElement("tr");
        row.dataset.studentId = s.id;

        let options = `<option value="">Выберите</option>`;
        for (let i = 1; i <= 10; i++) {
            options += `<option value="${i}">${i}</option>`;
        }

        const grade = await loadGrade(s.id, subject);

        row.innerHTML = `
            <td>${s.full_name}</td>
            <td>${grade}</td>
            <td>
                <select class="ability">${options}</select>
            </td>
            <td>
                <select class="rec">
                    <option value="1">Рекомендую</option>
                    <option value="2" selected>Не рекомендую</option>
                </select>
            </td>
        `;

        const ability = row.querySelector(".ability");
        const rec = row.querySelector(".rec");

        ability.addEventListener("change", () => {
            const val = Number(ability.value);
            setRowColor(row, val);
            if (val >= 6) rec.value = "1";
            else if (val > 0) rec.value = "2";
        });

        table.appendChild(row);
    }
}

saveBtn.addEventListener("click", async () => {
    try {
        const subjectName = subjectSelect.value;
        const subjectId = subjectMap[subjectName];
        const rows = table.querySelectorAll("tr");
        const recommendations = [];

        for (const row of rows) {
            const studentId = Number(row.dataset.studentId);
            const ability = row.querySelector(".ability")?.value;
            const rec = row.querySelector(".rec")?.value;

            if (!ability) continue;

            recommendations.push({
                studentId: studentId,
                subjectId: subjectId,
                score: Number(ability),
                recommendedClassId: Number(rec)
            });
        }

        const res = await fetch(API_URL + "recommendations/teacher/batch", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ recommendations })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || "Ошибка сервера");
        }

        alert(`Успешно: ${data.data.success}, Ошибки: ${data.data.failed}`);
    } catch (e) {
        alert("Ошибка: " + e.message);
    }
});

groupSelect.onchange = render;
subjectSelect.onchange = render;
yearSelect.onchange = render;

loadSubjects();
loadStudents();