import uvicorn

# Import the combined app from the apps file
from src.apps import app

# Run the application
if __name__ == "__main__":
    # Run using uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3001, reload=True)