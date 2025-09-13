# Run tests with coverage

pytest tests/ -v --cov=app --cov-report=html --cov-report=term-missing

# Or just terminal output

pytest tests/ -v --cov=app

# Or just HTML report

pytest tests/ -v --cov=app --cov-report=html
