from fastapi import HTTPException, status

class NoStudyInProgress(HTTPException):
    def __init__(self):
        super().__init__(status.HTTP_409_CONFLICT, "Aucune session d'étude en cours")
