from app.capacity.fairness import FairShare


class Clock:
    t = 0.0

    def __call__(self):
        return self.t


def test_burst_then_wait_then_refill():
    clock = Clock()
    f = FairShare(per_minute=6, burst=2, clock=clock)
    assert f.take("a") == 0 and f.take("a") == 0
    assert round(f.take("a")) == 10
    assert f.take("b") == 0  # other learners are not affected
    clock.t = 10
    assert f.take("a") == 0
