# RAG Chatbot Application

Đây là một ứng dụng chatbot sử dụng công nghệ Retrieval-Augmented Generation (RAG) với kiến trúc microservices, bao gồm backend được xây dựng bằng FastAPI và frontend bằng Next.js.

## Cấu Trúc Dự Án

```
rag_chatbot/
├── rag_chatbot_backend/          # Backend API (FastAPI)
├── RAG_chatbot_frontend/         # Frontend (Next.js)
├── docker-compose.yml            # Cấu hình Docker Compose
├── .env                          # Biến môi trường
└── .env.example                  # Ví dụ biến môi trường
```

## Backend (FastAPI)

Backend được triển khai trong thư mục `rag_chatbot_backend` với các tính năng chính:

- API RESTful sử dụng FastAPI
- Xác thực người dùng (JWT)
- Truy xuất và tạo sinh phản hồi (RAG)
- Lưu trữ tài liệu trong PostgreSQL với pgvector
- Tích hợp với Ollama để chạy mô hình ngôn ngữ cục bộ
- Tích hợp với Google Gemini API
- Xử lý tải lên tài liệu

### Công nghệ sử dụng:
- FastAPI
- PostgreSQL với pgvector
- SQLAlchemy (async)
- Alembic (migrations)
- LangChain
- Google Generative AI
- Ollama
- Pydantic Settings
- JWT

### Cách chạy backend:
```bash
cd rag_chatbot_backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Frontend (Next.js)

Frontend được triển khai trong thư mục `RAG_chatbot_frontend` với các tính năng chính:

- Giao diện người dùng hiện đại
- Trò chuyện real-time
- Quản lý tài liệu
- Cấu hình người dùng
- Đăng nhập/đăng xuất

### Công nghệ sử dụng:
- Next.js 13+ (App Router)
- React
- Tailwind CSS
- TypeScript

### Cách chạy frontend:
```bash
cd RAG_chatbot_frontend
npm install
npm run dev
```

## Docker Compose

Dự án hỗ trợ triển khai đầy đủ bằng Docker Compose với các service:
- PostgreSQL với pgvector (db)
- Ollama (ollama)
- Backend API (backend)
- Frontend (frontend)

### Cách chạy với Docker:
```bash
docker-compose up --build
```

## Cấu hình môi trường

Sao chép file `.env.example` thành `.env` và điền các giá trị cần thiết:

```
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=rag_chatbot

# JWT
JWT_SECRET_KEY=your_secret_key_here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_CHAT_MODEL=gemini-2.0-flash

# Ollama
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_EMBED_MODEL=embeddinggemma

# Admin Seed
ADMIN_SEED_USER_ID=00000000-0000-0000-0000-000000000001
ADMIN_SEED_USERNAME=admin
ADMIN_SEED_EMAIL=admin@company.com
ADMIN_SEED_PASSWORD=admin123

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

# Backend
ENVIRONMENT=development
STORAGE_DIR=/app/storage/uploads

# Ports
BACKEND_PORT=8000
FRONTEND_PORT=3000
```

## API Endpoints

Backend cung cấp các endpoint API chính:

- `POST /auth/register` - Đăng ký người dùng
- `POST /auth/login` - Đăng nhập
- `POST /auth/refresh` - Làm mới token
- `GET /users/me` - Lấy thông tin người dùng hiện tại
- `POST /documents/upload` - Tải lên tài liệu
- `GET /documents` - Lấy danh sách tài liệu
- `DELETE /documents/{id}` - Xóa tài liệu
- `POST /chat` - Gửi tin nhắn chat
- `GET /chat/history` - Lấy lịch sử trò chuyện
- `GET /health` - Kiểm tra tình trạng hệ thống

## Đóng góp

1. Fork repository này
2. Tạo nhánh tính năng mới (`git checkout -b feature/amazing-feature`)
3. Commit thay đổi của bạn (`git commit -m 'Add some amazing-feature'`)
4. Push lên nhánh (`git push origin feature/amazing-feature`)
5. Mở Pull Request

## Giấy phép

Dự án này được phân phối sotto giấy phép MIT. Xem file `LICENSE` để biết thêm chi tiết.

## Liên hệ

Nếu bạn có bất kỳ câu hỏi nào, vui lòng mở một issue trong repository này.