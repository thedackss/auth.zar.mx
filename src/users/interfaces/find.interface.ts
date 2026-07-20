interface FindId {
    id: string;
    email?: never;
}

interface FindEmail {
    id?: never;
    email: string;
}

export type FindUserProps = FindId | FindEmail;
