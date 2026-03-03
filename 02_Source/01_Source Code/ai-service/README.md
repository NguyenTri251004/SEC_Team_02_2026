# AI Service

FastAPI-based AI service for the Inventory Management System.

## Features

- **Demand Forecasting**: Predict future material demand
- **Anomaly Detection**: Identify unusual transaction patterns
- **Inventory Optimization**: Recommend optimal stock levels
- **Analytics**: Provide business intelligence insights

## Technologies

- FastAPI
- Redis for caching
- Elasticsearch for analytics
- Python ML libraries (to be implemented)

## API Endpoints

### Health Check
- `GET /health` - Service health status

### Predictions
- `POST /api/v1/predict/demand` - Predict material demand
- `POST /api/v1/detect/anomalies` - Detect transaction anomalies
- `POST /api/v1/optimize/inventory` - Get optimization recommendations

### Analytics
- `GET /api/v1/analytics/summary` - Overall analytics summary

## Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run service
uvicorn main:app --reload
```

## Docker

```bash
# Build image
docker build -t ims-ai-service .

# Run container
docker run -p 8000:8000 ims-ai-service
```

## TODO

- [ ] Implement ML models for demand forecasting
- [ ] Add anomaly detection algorithms
- [ ] Integrate with Elasticsearch for analytics
- [ ] Add caching with Redis
- [ ] Implement authentication
- [ ] Add comprehensive tests
