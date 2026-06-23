import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NuevaCompraComponent } from './nueva-compra.component';

describe('NuevaCompraComponent', () => {
  let component: NuevaCompraComponent;
  let fixture: ComponentFixture<NuevaCompraComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NuevaCompraComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NuevaCompraComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
