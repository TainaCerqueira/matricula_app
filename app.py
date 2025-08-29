import json
import re
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

# --- Dicionários para Decodificação de Horários (usados no backend) ---
DIAS_SEMANA = {
    '2': 'Segunda-feira', '3': 'Terça-feira', '4': 'Quarta-feira',
    '5': 'Quinta-feira', '6': 'Sexta-feira', '7': 'Sábado'
}
HORARIOS = {
    'M': {'1': '07:00', '2': '07:55', '3': '08:50', '4': '09:45', '5': '10:40', '6': '11:35'},
    'T': {'1': '13:00', '2': '13:55', '3': '14:50', '4': '15:45', '5': '16:40', '6': '17:35'},
    'N': {'1': '18:30', '2': '19:25', '3': '20:20', '4': '21:15'}
}

# --- Funções de Lógica ---
def traduzir_horario_completo(codigo):
    """Tradução completa do código de horário para formato legível."""
    partes = re.findall(r"(\d+)([MTN])([\d]+)", codigo)
    if not partes:
        return "Formato inválido"

    descricoes = []
    for dias_cod, turno, horarios_cod in partes:
        dias_str = " e ".join([DIAS_SEMANA.get(d, '?') for d in dias_cod])
        start_time = HORARIOS[turno].get(horarios_cod[0])
        
        end_slot_num_str = horarios_cod[-1]
        end_time_start_str = HORARIOS[turno].get(end_slot_num_str)
        if end_time_start_str:
            h, m = map(int, end_time_start_str.split(':'))
            end_m = m + 50
            end_h = h + end_m // 60
            end_m %= 60
            end_time = f"{end_h:02d}:{end_m:02d}"
        else:
            end_time = "N/A"
        descricoes.append(f"{dias_str} das {start_time} às {end_time}")

    return "; ".join(descricoes)


def gerar_blocos_de_tempo(codigo):
    """Gera uma lista de slots (dia_horario) para um código de horário."""
    blocos = []
    partes = re.findall(r"(\d+)([MTN])([\d]+)", codigo)
    if not partes:
        return blocos

    for dias_cod, turno, horarios_cod in partes:
        for dia_char in dias_cod:
            dia_str = DIAS_SEMANA.get(dia_char)
            if dia_str:
                for horario_char in horarios_cod:
                    horario_str = HORARIOS[turno].get(horario_char)
                    if horario_str:
                        blocos.append(f"{dia_str}_{horario_str}")
    return blocos


def carregar_dados_disciplinas(file_path):
    """Carrega os dados do arquivo JSON e processa os horários."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            dados_brutos = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"Erro ao carregar o arquivo de turmas: {e}")
        return []

    disciplinas_processadas = []
    id_counter = 0
    for disciplina_info in dados_brutos:
        for turma_info in disciplina_info["turmas"]:
            horario_raw = turma_info["horario"].split(" ")[0]
            
            # Garante que docente é uma string
            docente = turma_info.get("docente", "Não informado")
            if not isinstance(docente, str):
                docente = " e ".join(docente) if isinstance(docente, list) else "Não informado"

            disciplinas_processadas.append({
                'id': id_counter,
                'disciplina': disciplina_info['disciplina'],
                'turma': turma_info['turma'],
                'docente': docente,
                'horario_codigo': horario_raw,
                'horario_legivel': traduzir_horario_completo(horario_raw),
                'local': turma_info.get('local', 'N/A'),
                'blocos': gerar_blocos_de_tempo(horario_raw)
            })
            id_counter += 1
            
    return disciplinas_processadas

# Carrega os dados uma vez quando o servidor inicia
LISTA_DE_TURMAS = carregar_dados_disciplinas('turmas.txt')

# --- Rotas da Aplicação Web ---
@app.route('/')
def index():
    """Renderiza a página principal do calendário."""
    return render_template('index.html')

@app.route('/api/disciplinas-por-horario')
def get_disciplinas_por_horario():
    """API que retorna as disciplinas disponíveis para um dado horário."""
    dia = request.args.get('dia')
    horario = request.args.get('horario')

    if not dia or not horario:
        return jsonify({"error": "Parâmetros 'dia' e 'horario' são obrigatórios"}), 400

    chave_busca = f"{dia}_{horario}"
    
    opcoes = [
        turma for turma in LISTA_DE_TURMAS if chave_busca in turma['blocos']
    ]
    
    return jsonify(opcoes)

if __name__ == '__main__':
    # Para desenvolvimento local
    app.run(host='0.0.0.0', debug=True)

# Para deploy na Vercel, a aplicação precisa estar disponível no nível do módulo
# Isso já está feito com a variável 'app' definida no início do arquivo