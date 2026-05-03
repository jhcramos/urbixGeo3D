export interface Property {
    id: string;
    address: string;
    suburb: string;
    postcode: string;
    price: string;
    bedrooms: number;
    bathrooms: number;
    carSpaces: number;
    image: string;
    lat: number;
    lng: number;
    description: string;
    url: string;
}

export const mockProperties: Property[] = [
    {
        id: '1',
        address: '123 Ocean Drive',
        suburb: 'Sunshine Coast',
        postcode: '4551',
        price: '$1,250,000',
        bedrooms: 4,
        bathrooms: 2,
        carSpaces: 2,
        image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80',
        lat: -26.6500,
        lng: 153.0667,
        description: 'Stunning ocean views from this modern family home.',
        url: '#'
    },
    {
        id: '2',
        address: '45 Hinterland Way',
        suburb: 'Maleny',
        postcode: '4552',
        price: '$980,000',
        bedrooms: 3,
        bathrooms: 2,
        carSpaces: 1,
        image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=800&q=80',
        lat: -26.7500,
        lng: 152.8500,
        description: 'Peaceful retreat in the heart of the hinterland.',
        url: '#'
    },
    {
        id: '3',
        address: '78 Beachfront Parade',
        suburb: 'Maroochydore',
        postcode: '4558',
        price: '$2,100,000',
        bedrooms: 5,
        bathrooms: 3,
        carSpaces: 3,
        image: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=800&q=80',
        lat: -26.6580,
        lng: 153.0900,
        description: 'Luxury beachfront living at its finest.',
        url: '#'
    },
    {
        id: '4',
        address: '12 Noosa Parade',
        suburb: 'Noosa Heads',
        postcode: '4567',
        price: '$3,500,000',
        bedrooms: 4,
        bathrooms: 4,
        carSpaces: 2,
        image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b91d?auto=format&fit=crop&w=800&q=80',
        lat: -26.3950,
        lng: 153.0950,
        description: 'Exclusive waterfront property with private jetty.',
        url: '#'
    },
    {
        id: '5',
        address: '34 River Esplanade',
        suburb: 'Mooloolaba',
        postcode: '4557',
        price: '$1,750,000',
        bedrooms: 3,
        bathrooms: 2,
        carSpaces: 2,
        image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
        lat: -26.6800,
        lng: 153.1180,
        description: 'Contemporary apartment with river and ocean views.',
        url: '#'
    }
];
