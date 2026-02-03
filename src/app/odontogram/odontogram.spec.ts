import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OdontogramComponent } from './odontogram';
import { OdontogramState } from './dental-types';

describe('OdontogramComponent', () => {
  let component: OdontogramComponent;
  let fixture: ComponentFixture<OdontogramComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OdontogramComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(OdontogramComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Arch definitions', () => {
    it('should have 16 teeth in upper arch', () => {
      expect(component.upperArch.length).toBe(16);
    });

    it('should have 16 teeth in lower arch', () => {
      expect(component.lowerArch.length).toBe(16);
    });

    it('should have correct FDI numbering for upper arch', () => {
      expect(component.upperArch[0]).toBe(18); // Upper right third molar
      expect(component.upperArch[7]).toBe(11); // Upper right central incisor
      expect(component.upperArch[8]).toBe(21); // Upper left central incisor
      expect(component.upperArch[15]).toBe(28); // Upper left third molar
    });

    it('should have correct FDI numbering for lower arch', () => {
      expect(component.lowerArch[0]).toBe(48); // Lower right third molar
      expect(component.lowerArch[7]).toBe(41); // Lower right central incisor
      expect(component.lowerArch[8]).toBe(31); // Lower left central incisor
      expect(component.lowerArch[15]).toBe(38); // Lower left third molar
    });
  });

  describe('getTreatmentsForTooth', () => {
    it('should return empty array for tooth with no treatments', () => {
      const treatments = component.getTreatmentsForTooth(11);
      expect(treatments).toEqual([]);
    });

    it('should return treatments for tooth with data', () => {
      fixture.componentRef.setInput('data', {
        11: [{ type: 'caries', surface: 'occlusal' }]
      } as OdontogramState);
      fixture.detectChanges();

      const treatments = component.getTreatmentsForTooth(11);
      expect(treatments.length).toBe(1);
      expect(treatments[0].type).toBe('caries');
    });
  });

  describe('getToothData', () => {
    it('should return empty object for healthy tooth', () => {
      const data = component.getToothData(11);
      expect(data).toEqual({});
    });

    it('should map surface treatments correctly', () => {
      fixture.componentRef.setInput('data', {
        11: [{ type: 'caries', surface: 'occlusal' }]
      } as OdontogramState);
      fixture.detectChanges();

      const data = component.getToothData(11);
      expect(data.center).toBe('caries');
    });

    it('should apply extraction to all surfaces', () => {
      fixture.componentRef.setInput('data', {
        11: [{ type: 'extraction' }]
      } as OdontogramState);
      fixture.detectChanges();

      const data = component.getToothData(11);
      expect(data.center).toBe('extraction');
      expect(data.top).toBe('extraction');
      expect(data.bottom).toBe('extraction');
      expect(data.left).toBe('extraction');
      expect(data.right).toBe('extraction');
    });
  });

  describe('isRightSide', () => {
    it('should return true for quadrant 1 teeth', () => {
      expect(component.isRightSide(11)).toBeTrue();
      expect(component.isRightSide(18)).toBeTrue();
    });

    it('should return true for quadrant 4 teeth', () => {
      expect(component.isRightSide(41)).toBeTrue();
      expect(component.isRightSide(48)).toBeTrue();
    });

    it('should return false for quadrant 2 and 3 teeth', () => {
      expect(component.isRightSide(21)).toBeFalse();
      expect(component.isRightSide(31)).toBeFalse();
    });
  });

  describe('Template rendering', () => {
    it('should render 32 tooth components', () => {
      const toothElements = fixture.nativeElement.querySelectorAll('app-tooth');
      expect(toothElements.length).toBe(32);
    });

    it('should render midline separators', () => {
      const separators = fixture.nativeElement.querySelectorAll('.midline-separator');
      expect(separators.length).toBe(2); // One for each arch
    });
  });
});
