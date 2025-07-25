# Assignment 11 - Category 10 Backend

This is the backend for **Assignment 11 - Category 10**. It provides RESTful APIs to manage and serve data for the application.

## Features

- Node.js & Express backend
- CRUD operations for categories and items
- MongoDB integration with Mongoose
- CORS enabled for frontend communication
- Error handling and validation

## Getting Started

### Prerequisites

- Node.js (v14+)
- MongoDB

### Installation

1. Clone the repository:
    ```bash
    git clone <repository-url>
    cd backend
    ```

2. Install dependencies:
    ```bash
    npm install
    ```

3. Create a `.env` file with your MongoDB URI:
    ```
    MONGODB_URI=your_mongodb_connection_string
    PORT=5000
    ```

4. Start the server:
    ```bash
    npm start
    ```

## API Endpoints

| Method | Endpoint           | Description              |
|--------|--------------------|--------------------------|
| GET    | `/api/categories`  | Get all categories       |
| POST   | `/api/categories`  | Create a new category    |
| GET    | `/api/items`       | Get all items            |
| POST   | `/api/items`       | Create a new item        |
| ...    | ...                | ...                      |

## Folder Structure

```
backend/
├── controllers/
├── models/
├── routes/
├── .env.example
├── server.js
└── README.md
```

## License

This project is for educational purposes.
#   a p p O r b i t - s e r v e r  
 #   a p p O r b i t - s e r v e r  
 