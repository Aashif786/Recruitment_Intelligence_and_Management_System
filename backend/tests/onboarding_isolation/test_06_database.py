
import pytest

def test_database_persistence(db_session, sample_application):
    sample_application.employee_id = "EMP-999999"
    db_session.commit()
    
    from app.domain.models import Application, Onboarding
    app = db_session.query(Application).join(Onboarding).filter(Onboarding.employee_id == "EMP-999999").first()
    assert app is not None
    assert app.id == sample_application.id
