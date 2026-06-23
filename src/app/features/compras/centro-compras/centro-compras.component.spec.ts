import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CentroComprasComponent } from './centro-compras.component';

describe('CentroComprasComponent', () => {
  let component: CentroComprasComponent;
  let fixture: ComponentFixture<CentroComprasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CentroComprasComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CentroComprasComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
