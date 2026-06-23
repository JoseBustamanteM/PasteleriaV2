import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditarVentaModalComponent } from './editar-venta-modal.component';

describe('EditarVentaModalComponent', () => {
  let component: EditarVentaModalComponent;
  let fixture: ComponentFixture<EditarVentaModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditarVentaModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EditarVentaModalComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
