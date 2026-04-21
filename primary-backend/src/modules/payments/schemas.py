from pydantic import BaseModel
from typing import Literal


# Request schemas
# No request body needed for onramp endpoint


# Response schemas
class OnrampResponseSchema(BaseModel):
    message: Literal["Onramp successful"]
    credits: int


class OnrampFailedResponseSchema(BaseModel):
    message: Literal["Onramp failed"]
