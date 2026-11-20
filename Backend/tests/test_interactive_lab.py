from src.manage import main

LAB = "/learning/interactive-lab"


def test_lab_checks_the_current_plan_before_issuing_an_activity(client, auth, agent):
    assert client.get(f"{LAB}/derivabilite").status_code == 401
    denied = client.get(f"{LAB}/derivabilite", headers=auth)
    assert denied.status_code == 403
    assert denied.json()["detail"] == {"error": "pro_required", "feature": "interactive_lab"}

    assert main(["set-plan", "eleve01", "pro"]) == 0
    response = client.get(f"{LAB}/derivabilite", headers=auth)
    assert response.status_code == 200
    activity = response.json()
    assert activity["topic"] == "derivabilite"
    assert activity["frames"][0]["value"] == -2
    assert activity["frames"][0]["answer"] == -4
    response = client.get(f"{LAB}/history_0", headers=auth)
    assert response.status_code == 200
    assert response.json()["topic"] == "history_0"
    assert len(response.json()["cases"]) == 2
    assert client.get(f"{LAB}/nonexistent", headers=auth).status_code == 404

    assert main(["set-plan", "eleve01", "free"]) == 0
    assert client.get(f"{LAB}/derivabilite", headers=auth).status_code == 403
    assert not agent.calls
