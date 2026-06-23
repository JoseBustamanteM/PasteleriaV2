import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InsumosComponent } from './insumos.component';

describe('InsumosComponent', () => {
  let component: InsumosComponent;
  let fixture: ComponentFixture<InsumosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InsumosComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InsumosComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
