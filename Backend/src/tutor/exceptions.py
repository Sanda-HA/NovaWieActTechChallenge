from fastapi import HTTPException, status

class SessionNotFound(HTTPException):
    def __init__(self):
        super().__init__(status.HTTP_404_NOT_FOUND, "Session introuvable")

class ResponseNotFound(HTTPException):
    def __init__(self):
        super().__init__(status.HTTP_404_NOT_FOUND, "Réponse introuvable")
