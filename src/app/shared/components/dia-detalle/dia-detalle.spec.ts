import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiaDetalle } from './dia-detalle';

describe('DiaDetalle', () => {
  let component: DiaDetalle;
  let fixture: ComponentFixture<DiaDetalle>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiaDetalle],
    }).compileComponents();

    fixture = TestBed.createComponent(DiaDetalle);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
