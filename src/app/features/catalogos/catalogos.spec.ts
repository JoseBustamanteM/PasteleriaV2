import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Catalogos } from './catalogos';

describe('Catalogos', () => {
  let component: Catalogos;
  let fixture: ComponentFixture<Catalogos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Catalogos],
    }).compileComponents();

    fixture = TestBed.createComponent(Catalogos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
