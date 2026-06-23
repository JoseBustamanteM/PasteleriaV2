import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionMetodosPagoComponent } from './gestion-metodos-pago.component';

describe('GestionMetodosPagoComponent', () => {
  let component: GestionMetodosPagoComponent;
  let fixture: ComponentFixture<GestionMetodosPagoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionMetodosPagoComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GestionMetodosPagoComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
