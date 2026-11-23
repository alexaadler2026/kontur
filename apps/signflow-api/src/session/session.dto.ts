import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

/** Sign-in: e-mail and password (ADR-0010). */
export class CreateSessionDto {
  /**
   * The account's e-mail; case does not matter.
   * @example "aigul.sadykova@firma.kg"
   */
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  /**
   * At most 128 characters (NFC code points, as in the password rules). Longer input is
   * rejected here, before Argon2 spends time and memory on it.
   * @example "Grüne Berge über Bischkek"
   */
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.normalize('NFC') : value,
  )
  @IsNotEmpty()
  @IsString()
  // The u flag: [\s\S] is one code point, so "🙂" counts once, as in checkPassword().
  @Matches(/^[\s\S]{1,128}$/u)
  password!: string;
}

/** The signed-in user, as the SPA needs it. */
export class SessionUserDto {
  /** @example "01936b2e-8f3a-7c4d-9e1f-2a3b4c5d6e7f" */
  id!: string;

  /** @example "Aigul.Sadykova@Firma.kg" */
  email!: string;
}

/** Answer of GET /session: who is signed in with this cookie. */
export class SessionDto {
  user!: SessionUserDto;
}
