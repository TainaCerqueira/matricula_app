document.addEventListener('DOMContentLoaded', function() {
    const DIAS_SEMANA = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const SLOTS_CALENDARIO = [
        "07:00", "07:55", "08:50", "09:45", "10:40", "11:35",
        "12:25", // Intervalo
        "13:00", "13:55", "14:50", "15:45", "16:40", "17:35",
        "18:25", // Intervalo
        "18:30", "19:25", "20:20", "21:15"
    ];

    const calendarBody = document.getElementById('calendar-body');
    const headerRow = document.getElementById('header-row');
    const modal = document.getElementById('class-modal');
    const closeButton = document.querySelector('.close-button');
    const classOptionsContainer = document.getElementById('class-options');
    const clearButton = document.getElementById('clear-schedule');

    const selectedClasses = {};
    let colorIndex = 0;
    const colors = ['#f8b195', '#f67280', '#c06c84', '#6c5b7b', '#355c7d', '#99b898', '#feceab', '#ff847c', '#e84a5f', '#2a363b'];

    function createCalendar() {
        // Limpa calendário existente
        headerRow.innerHTML = '';
        calendarBody.innerHTML = '';

        // Cria cabeçalho
        let th = document.createElement('th');
        th.textContent = 'Horário';
        headerRow.appendChild(th);
        DIAS_SEMANA.forEach(dia => {
            th = document.createElement('th');
            th.textContent = dia;
            headerRow.appendChild(th);
        });

        // Cria corpo do calendário
        SLOTS_CALENDARIO.forEach(slot => {
            const tr = document.createElement('tr');
            
            if (slot === "12:25" || slot === "18:25") {
                const intervalCell = document.createElement('td');
                intervalCell.colSpan = DIAS_SEMANA.length + 1;
                intervalCell.textContent = "--- TURNO ---";
                intervalCell.classList.add('interval');
                tr.appendChild(intervalCell);
            } else {
                const timeCell = document.createElement('td');
                timeCell.textContent = slot;
                timeCell.classList.add('time-label');
                tr.appendChild(timeCell);

                DIAS_SEMANA.forEach(dia => {
                    const cell = document.createElement('td');
                    cell.dataset.day = dia;
                    cell.dataset.time = slot;
                    cell.classList.add('time-slot');
                    tr.appendChild(cell);
                });
            }
            calendarBody.appendChild(tr);
        });
    }

    async function handleSlotClick(event) {
        const cell = event.target;
        if (!cell.classList.contains('time-slot')) return;

        // Se a célula já estiver ocupada, não faz nada
        if (cell.classList.contains('occupied')) {
            alert('Este horário já está preenchido. Para adicionar outra disciplina, por favor, limpe a grade primeiro.');
            return;
        }

        const day = cell.dataset.day;
        const time = cell.dataset.time;

        // Busca no backend
        try {
            const response = await fetch(`/api/disciplinas-por-horario?dia=${day}&horario=${time}`);
            if (!response.ok) throw new Error('Falha ao buscar dados.');
            
            const classes = await response.json();
            showClassOptions(classes);
        } catch (error) {
            console.error("Erro:", error);
            classOptionsContainer.innerHTML = `<p>Não foi possível carregar as disciplinas. Tente novamente.</p>`;
            modal.style.display = 'block';
        }
    }

    function showClassOptions(classes) {
        classOptionsContainer.innerHTML = '';
        if (classes.length === 0) {
            classOptionsContainer.innerHTML = '<p>Nenhuma disciplina encontrada para este horário.</p>';
        } else {
            classes.forEach(cls => {
                const classDiv = document.createElement('div');
                classDiv.classList.add('class-option');
                classDiv.innerHTML = `
                    <strong>${cls.disciplina} (${cls.turma})</strong>
                    <p><strong>Professor(a):</strong> ${cls.docente}</p>
                    <p><strong>Horário:</strong> ${cls.horario_legivel}</p>
                    <p><strong>Local:</strong> ${cls.local}</p>
                `;
                const selectButton = document.createElement('button');
                selectButton.textContent = 'Adicionar à Grade';
                selectButton.onclick = () => selectClass(cls);
                classDiv.appendChild(selectButton);
                classOptionsContainer.appendChild(classDiv);
            });
        }
        modal.style.display = 'block';
    }

    function selectClass(classData) {
        // Verificar conflitos
        for (const bloco of classData.blocos) {
            if (document.querySelector(`[data-day="${bloco.split('_')[0]}"][data-time="${bloco.split('_')[1]}"]`).classList.contains('occupied')) {
                alert('Conflito de horário! Esta disciplina colide com outra já selecionada.');
                return;
            }
        }
        
        const classColor = colors[colorIndex % colors.length];
        colorIndex++;

        classData.blocos.forEach(bloco => {
            const [dia, horario] = bloco.split('_');
            const cell = document.querySelector(`[data-day="${dia}"][data-time="${horario}"]`);
            if (cell) {
                cell.classList.add('occupied');
                cell.style.backgroundColor = classColor;
                cell.innerHTML = `<span>${classData.disciplina.split(' - ')[0]}</span>`;
            }
        });

        selectedClasses[classData.id] = classData;
        modal.style.display = 'none';
    }

    function clearSchedule() {
        const allSlots = document.querySelectorAll('.time-slot');
        allSlots.forEach(slot => {
            slot.classList.remove('occupied');
            slot.style.backgroundColor = '';
            slot.innerHTML = '';
        });
        Object.keys(selectedClasses).forEach(key => delete selectedClasses[key]);
        colorIndex = 0;
    }

    // Event Listeners
    calendarBody.addEventListener('click', handleSlotClick);
    closeButton.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    });
    clearButton.addEventListener('click', clearSchedule);

    // Inicialização
    createCalendar();
});