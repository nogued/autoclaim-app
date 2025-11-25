from abc import ABC, abstractmethod
from typing import Dict, Any


class AgentInterface(ABC):
    """Interface for claim processing agents."""

    @abstractmethod
    def analyze_damage(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze damage from provided payload."""
        pass

    @abstractmethod
    def generate_estimate(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Generate repair estimate from damage assessment."""
        pass

    @abstractmethod
    def review_estimate(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Claim Approval & Authorization: Review and approve/reject estimate."""
        pass

