from sqlalchemy import Column, Integer, DateTime, Text, String
from datetime import datetime
from .db import Base

class SimulationRun(Base):
    __tablename__ = "simulation_runs"
    id = Column(Integer, primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    title = Column(String(200), nullable=False)
    decision_text = Column(Text, nullable=False)

    inputs_json = Column(Text, nullable=False)   # stored for reproducibility
    output_json = Column(Text, nullable=False)   # model result (facts + scenarios)
