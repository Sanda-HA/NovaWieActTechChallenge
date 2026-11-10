from dataclasses import dataclass

from app.capacity.governor import Level


@dataclass
class Limits:
    max_rounds: int = 2
    max_tool_calls: int = 4
    chunks_per_search: int = 4
    max_chunks: int = 8
    rounds: int = 0
    tool_calls: int = 0

    @classmethod
    def for_level(cls, level: Level) -> "Limits":
        if level >= Level.ECO:
            return cls(max_rounds=1, max_tool_calls=2, chunks_per_search=3, max_chunks=4)
        return cls()

    def can_search(self) -> bool:
        return self.rounds < self.max_rounds and self.tool_calls < self.max_tool_calls
