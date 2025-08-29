"""
WSGI entry point para deploy na Vercel
Este arquivo serve como ponto de entrada para a aplicação Flask na Vercel
"""
import sys
import os

# Adiciona o diretório atual ao PATH do Python
sys.path.insert(0, os.path.dirname(__file__))

# Importa a aplicação Flask
from app import app as application

# Para compatibilidade com a Vercel, exporta a aplicação
app = application

if __name__ == "__main__":
    # Para testes locais
    app.run(debug=True)

