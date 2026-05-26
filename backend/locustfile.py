from locust import HttpUser, task, between

class HRUser(HttpUser):
    wait_time = between(1, 2.5)

    def on_start(self):
        # We simulate a logged-in HR user by acquiring a token
        response = self.client.post("/api/auth/login", json={
            "email": "hr_automated_test@example.com",
            "password": "Password123!"
        })
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.client.headers.update({"Authorization": f"Bearer {token}"})
        else:
            print(f"Failed to login during load test setup: {response.text}")

    @task(3)
    def view_dashboard(self):
        self.client.get("/api/analytics/dashboard")

    @task(2)
    def list_jobs(self):
        self.client.get("/api/jobs")

    @task(2)
    def list_applications(self):
        self.client.get("/api/applications")

    @task(1)
    def view_notifications(self):
        self.client.get("/api/notifications")

class PublicCandidate(HttpUser):
    wait_time = between(1, 3)

    @task(3)
    def view_public_jobs(self):
        self.client.get("/api/jobs/public")

    @task(1)
    def access_health(self):
        self.client.get("/")
