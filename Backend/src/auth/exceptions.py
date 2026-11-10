from fastapi import HTTPException, status

class PseudoAlreadyUsed(HTTPException):
    def __init__(self):
        super().__init__(status.HTTP_409_CONFLICT, "Pseudo déjà utilisé")

class InvalidCredentials(HTTPException):
    def __init__(self):
        super().__init__(status.HTTP_401_UNAUTHORIZED, "Identifiants invalides")
        
class InvalidToken(HTTPException):
    def __init__(self):
        super().__init__(status.HTTP_401_UNAUTHORIZED, "Jeton invalide ou expiré")