import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToothComponent, ToothZone, ToothCondition, ToothSurfaceData } from './tooth';

describe('ToothComponent', () => {
  let component: ToothComponent;
  let fixture: ComponentFixture<ToothComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToothComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ToothComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default toothNumber of 0', () => {
    expect(component.toothNumber).toBe(0);
  });

  it('should have empty data by default', () => {
    expect(component.data).toEqual({});
  });

  it('should have 5 defined zones', () => {
    expect(component.zones.center).toBeDefined();
    expect(component.zones.top).toBeDefined();
    expect(component.zones.bottom).toBeDefined();
    expect(component.zones.left).toBeDefined();
    expect(component.zones.right).toBeDefined();
  });

  describe('getZoneClass', () => {
    it('should return zone-default for healthy or undefined zones', () => {
      expect(component.getZoneClass('center')).toBe('zone-default');
      
      component.data = { center: 'healthy' };
      expect(component.getZoneClass('center')).toBe('zone-default');
    });

    it('should return zone-caries for caries condition', () => {
      component.data = { top: 'caries' };
      expect(component.getZoneClass('top')).toBe('zone-caries');
    });

    it('should return zone-filling for filling condition', () => {
      component.data = { left: 'filling' };
      expect(component.getZoneClass('left')).toBe('zone-filling');
    });

    it('should return zone-crown for crown condition', () => {
      component.data = { right: 'crown' };
      expect(component.getZoneClass('right')).toBe('zone-crown');
    });

    it('should return zone-extraction for extraction condition', () => {
      component.data = { bottom: 'extraction' };
      expect(component.getZoneClass('bottom')).toBe('zone-extraction');
    });

    it('should return zone-root-canal for root-canal condition', () => {
      component.data = { center: 'root-canal' };
      expect(component.getZoneClass('center')).toBe('zone-root-canal');
    });
  });

  describe('onZoneClick', () => {
    it('should emit zoneClick event with correct data', () => {
      component.toothNumber = 11;
      component.data = { center: 'caries' };
      
      spyOn(component.zoneClick, 'emit');
      
      component.onZoneClick('center');
      
      expect(component.zoneClick.emit).toHaveBeenCalledWith({
        toothNumber: 11,
        zone: 'center',
        currentCondition: 'caries'
      });
    });

    it('should emit undefined condition for healthy zone', () => {
      component.toothNumber = 21;
      component.data = {};
      
      spyOn(component.zoneClick, 'emit');
      
      component.onZoneClick('top');
      
      expect(component.zoneClick.emit).toHaveBeenCalledWith({
        toothNumber: 21,
        zone: 'top',
        currentCondition: undefined
      });
    });
  });

  describe('getTooltip', () => {
    it('should return correct tooltip for healthy zone', () => {
      component.data = {};
      expect(component.getTooltip('center')).toBe('Occlusal - healthy');
    });

    it('should return correct tooltip for zone with condition', () => {
      component.data = { top: 'caries' };
      expect(component.getTooltip('top')).toBe('Vestibular - caries');
    });
  });

  describe('zone labels', () => {
    it('should have correct labels for all zones', () => {
      expect(component.zoneLabels.center).toBe('Occlusal');
      expect(component.zoneLabels.top).toBe('Vestibular');
      expect(component.zoneLabels.bottom).toBe('Lingual/Palatal');
      expect(component.zoneLabels.left).toBe('Mesial');
      expect(component.zoneLabels.right).toBe('Distal');
    });
  });

  describe('SVG rendering', () => {
    it('should render 5 polygon elements', () => {
      const polygons = fixture.nativeElement.querySelectorAll('polygon');
      expect(polygons.length).toBe(5);
    });

    it('should have tooth-zone class on all polygons', () => {
      const polygons = fixture.nativeElement.querySelectorAll('.tooth-zone');
      expect(polygons.length).toBe(5);
    });
  });
});
